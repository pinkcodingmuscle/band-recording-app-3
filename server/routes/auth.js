import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import verifyJWT from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

const rpName = process.env.RP_NAME || 'BandLab Studio';
const rpID   = process.env.RP_ID || 'localhost';
const expectedOrigin  = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const clientOrigin    = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const serverURL       = process.env.SERVER_URL    || 'http://localhost:4000';

// ── In-memory challenge store (TTL: 5 min) ────────────────────────────────────
const challengeStore = new Map();

function storeChallengeToken(data) {
  const token = randomBytes(16).toString('hex');
  challengeStore.set(token, { ...data, expiresAt: Date.now() + 5 * 60 * 1000 });
  return token;
}

function consumeChallenge(token) {
  const entry = challengeStore.get(token);
  challengeStore.delete(token);
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry;
}

// Prune expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of challengeStore.entries()) {
    if (v.expiresAt < now) challengeStore.delete(k);
  }
}, 60_000);

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeToken(userId, isAdmin = false) {
  return jwt.sign({ userId, isAdmin }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function userView(doc) {
  return {
    id: doc._id.toString(),
    username: doc.displayName,
    avatar: doc.avatar,
    isAdmin: doc.isAdmin === true,
  };
}

// ── Email / password ──────────────────────────────────────────────────────────

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, displayName, avatar } = req.body;
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'email, password, and displayName are required' });
    }
    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ error: 'Email already in use' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash, displayName, avatar: avatar || '🎵' });
    res.status(201).json({ token: makeToken(user._id.toString(), user.isAdmin), user: userView(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ token: makeToken(user._id.toString(), user.isAdmin), user: userView(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', verifyJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: userView(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Passkey: new-account signup ───────────────────────────────────────────────

// POST /api/auth/passkey/signup-options
router.post('/passkey/signup-options', async (req, res) => {
  try {
    const { email, displayName, avatar } = req.body;
    if (!email || !displayName) {
      return res.status(400).json({ error: 'email and displayName are required' });
    }
    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ error: 'Email already in use' });

    const userIdBytes = randomBytes(32);
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: email.toLowerCase().trim(),
      userDisplayName: displayName,
      userID: userIdBytes,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    const challengeToken = storeChallengeToken({
      challenge: options.challenge,
      email: email.toLowerCase().trim(),
      displayName,
      avatar: avatar || '🎵',
      passkeyUserId: userIdBytes.toString('base64url'),
      type: 'signup',
    });

    res.json({ options, challengeToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/passkey/signup-verify
router.post('/passkey/signup-verify', async (req, res) => {
  try {
    const { challengeToken, attResp } = req.body;
    const entry = consumeChallenge(challengeToken);
    if (!entry || entry.type !== 'signup') {
      return res.status(400).json({ error: 'Invalid or expired challenge' });
    }

    const verification = await verifyRegistrationResponse({
      response: attResp,
      expectedChallenge: entry.challenge,
      expectedOrigin,
      expectedRPID: rpID,
    });

    if (!verification.verified) {
      return res.status(400).json({ error: 'Passkey verification failed' });
    }

    const { credential } = verification.registrationInfo;

    const exists = await User.findOne({ email: entry.email });
    if (exists) return res.status(409).json({ error: 'Email already in use' });

    const user = await User.create({
      email: entry.email,
      passwordHash: randomBytes(32).toString('hex'), // unusable dummy hash
      displayName: entry.displayName,
      avatar: entry.avatar,
      passkeyUserId: Buffer.from(entry.passkeyUserId, 'base64url'),
      passkeys: [{
        credentialID: credential.id,
        publicKey: Buffer.from(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports || [],
        deviceType: verification.registrationInfo.credentialDeviceType,
        backedUp: verification.registrationInfo.credentialBackedUp,
      }],
    });

    res.status(201).json({ token: makeToken(user._id.toString(), user.isAdmin), user: userView(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Passkey: authentication (login) ──────────────────────────────────────────

// POST /api/auth/passkey/login-options
router.post('/passkey/login-options', async (req, res) => {
  try {
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred',
    });

    const challengeToken = storeChallengeToken({
      challenge: options.challenge,
      type: 'login',
    });

    res.json({ options, challengeToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/passkey/login-verify
router.post('/passkey/login-verify', async (req, res) => {
  try {
    const { challengeToken, authResp } = req.body;
    const entry = consumeChallenge(challengeToken);
    if (!entry || entry.type !== 'login') {
      return res.status(400).json({ error: 'Invalid or expired challenge' });
    }

    const credentialID = authResp.id;
    const user = await User.findOne({ 'passkeys.credentialID': credentialID });
    if (!user) {
      return res.status(401).json({ error: 'No passkey found for this device. Please sign up first.' });
    }

    const passkeyDoc = user.passkeys.find(pk => pk.credentialID === credentialID);

    const verification = await verifyAuthenticationResponse({
      response: authResp,
      expectedChallenge: entry.challenge,
      expectedOrigin,
      expectedRPID: rpID,
      credential: {
        id: passkeyDoc.credentialID,
        publicKey: passkeyDoc.publicKey,
        counter: passkeyDoc.counter,
        transports: passkeyDoc.transports,
      },
    });

    if (!verification.verified) {
      return res.status(401).json({ error: 'Passkey authentication failed' });
    }

    passkeyDoc.counter = verification.authenticationInfo.newCounter;
    await user.save();

    res.json({ token: makeToken(user._id.toString(), user.isAdmin), user: userView(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Passkey: add to existing account (authenticated) ─────────────────────────

// POST /api/auth/passkey/register-options  (requires JWT)
router.post('/passkey/register-options', verifyJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const excludeCredentials = user.passkeys.map(pk => ({
      id: pk.credentialID,
      transports: pk.transports,
    }));

    let userIdBytes = user.passkeyUserId;
    if (!userIdBytes) {
      userIdBytes = randomBytes(32);
      user.passkeyUserId = userIdBytes;
      await user.save();
    }

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: user.email,
      userDisplayName: user.displayName,
      userID: userIdBytes,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    const challengeToken = storeChallengeToken({
      challenge: options.challenge,
      userId: user._id.toString(),
      type: 'register',
    });

    res.json({ options, challengeToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/passkey/register-verify  (requires JWT)
router.post('/passkey/register-verify', verifyJWT, async (req, res) => {
  try {
    const { challengeToken, attResp } = req.body;
    const entry = consumeChallenge(challengeToken);
    if (!entry || entry.type !== 'register' || entry.userId !== req.user.userId) {
      return res.status(400).json({ error: 'Invalid or expired challenge' });
    }

    const verification = await verifyRegistrationResponse({
      response: attResp,
      expectedChallenge: entry.challenge,
      expectedOrigin,
      expectedRPID: rpID,
    });

    if (!verification.verified) {
      return res.status(400).json({ error: 'Passkey verification failed' });
    }

    const { credential } = verification.registrationInfo;

    const user = await User.findById(entry.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const alreadyRegistered = user.passkeys.some(pk => pk.credentialID === credential.id);
    if (alreadyRegistered) {
      return res.status(409).json({ error: 'This passkey is already registered' });
    }

    user.passkeys.push({
      credentialID: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports || [],
      deviceType: verification.registrationInfo.credentialDeviceType,
      backedUp: verification.registrationInfo.credentialBackedUp,
    });
    await user.save();

    res.json({ ok: true, passkeyCount: user.passkeys.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Google OAuth ──────────────────────────────────────────────────────────────

// GET /api/auth/google
router.get('/google', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${clientOrigin}?error=${encodeURIComponent('Google login is not configured on this server')}`);
  }
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', `${serverURL}/api/auth/google/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('prompt', 'select_account');
  res.redirect(url.toString());
});

// GET /api/auth/google/callback
router.get('/google/callback', async (req, res) => {
  const { code, error: oauthError } = req.query;
  if (oauthError || !code) {
    return res.redirect(`${clientOrigin}?error=${encodeURIComponent('Google sign-in was cancelled')}`);
  }
  try {
    // Exchange authorisation code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${serverURL}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokens.id_token) throw new Error('No ID token returned from Google');

    // Decode the ID token payload (trust the HTTPS response from Google's token endpoint)
    const [, payloadB64] = tokens.id_token.split('.');
    const { sub: googleId, email, name } = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    );
    if (!email) throw new Error('Could not retrieve email from Google');

    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await User.create({
        email: email.toLowerCase(),
        passwordHash: randomBytes(32).toString('hex'),
        displayName: name || email.split('@')[0],
        avatar: '🎵',
      });
    }

    const token = makeToken(user._id.toString(), user.isAdmin);
    res.redirect(`${clientOrigin}?token=${token}`);
  } catch (err) {
    res.redirect(`${clientOrigin}?error=${encodeURIComponent('Google sign-in failed. Please try again.')}`);
  }
});

// ── Microsoft OAuth ───────────────────────────────────────────────────────────

// GET /api/auth/microsoft
router.get('/microsoft', (req, res) => {
  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
    return res.redirect(`${clientOrigin}?error=${encodeURIComponent('Microsoft login is not configured on this server')}`);
  }
  const url = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
  url.searchParams.set('client_id', process.env.MICROSOFT_CLIENT_ID);
  url.searchParams.set('redirect_uri', `${serverURL}/api/auth/microsoft/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile User.Read');
  url.searchParams.set('prompt', 'select_account');
  res.redirect(url.toString());
});

// GET /api/auth/microsoft/callback
router.get('/microsoft/callback', async (req, res) => {
  const { code, error: oauthError } = req.query;
  if (oauthError || !code) {
    return res.redirect(`${clientOrigin}?error=${encodeURIComponent('Microsoft sign-in was cancelled')}`);
  }
  try {
    // Exchange authorisation code for tokens
    const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.MICROSOFT_CLIENT_ID,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
        redirect_uri: `${serverURL}/api/auth/microsoft/callback`,
        grant_type: 'authorization_code',
        scope: 'openid email profile User.Read',
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokens.access_token) throw new Error('No access token returned from Microsoft');

    // Fetch user profile from Microsoft Graph
    const profileRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();
    const email = (profile.mail || profile.userPrincipalName || '').toLowerCase();
    if (!email) throw new Error('Could not retrieve email from Microsoft');
    const displayName = profile.displayName || email.split('@')[0];

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        passwordHash: randomBytes(32).toString('hex'),
        displayName,
        avatar: '🎵',
      });
    }

    const token = makeToken(user._id.toString(), user.isAdmin);
    res.redirect(`${clientOrigin}?token=${token}`);
  } catch (err) {
    res.redirect(`${clientOrigin}?error=${encodeURIComponent('Microsoft sign-in failed. Please try again.')}`);
  }
});

export default router;
