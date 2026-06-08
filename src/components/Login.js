import React, { useState, useEffect } from 'react';
import './Login.css';
import {
  BASE,
  isApiConfigured,
  apiSignup,
  apiLogin,
  apiPasskeySignupOptions,
  apiPasskeySignupVerify,
  apiPasskeyLoginOptions,
  apiPasskeyLoginVerify,
} from '../lib/api';

const AVATARS = ['😎', '🎸', '🎤', '🎹', '🥁', '🎵', '🎼', '🎧', '🎺', '🎷'];
const randomAvatar = () => AVATARS[Math.floor(Math.random() * AVATARS.length)];
const makeSessionId = () => 'sess' + Math.floor(10000 + Math.random() * 90000);

function buildUser(id, name, avatar, extras = {}) {
  const sessionId = makeSessionId();
  return {
    id,
    username: name,
    avatar,
    sessionId,
    displayName: `${name}-${sessionId}`,
    isAdmin: extras.isAdmin === true,
  };
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 21 21" width="18" height="18" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
      <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
    </svg>
  );
}

function Login({ onLogin, initialError = '' }) {
  // ── Email state ────────────────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(randomAvatar);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);

  // ── Passkey state ──────────────────────────────────────────────────────────
  const [pkLoading, setPkLoading] = useState(false);
  const [webauthnSupported, setWebauthnSupported] = useState(false);
  const [showPasskeySignup, setShowPasskeySignup] = useState(false);
  const [pkEmail, setPkEmail] = useState('');
  const [pkDisplayName, setPkDisplayName] = useState('');
  const [pkAvatar, setPkAvatar] = useState(randomAvatar);

  useEffect(() => {
    import('@simplewebauthn/browser')
      .then(({ browserSupportsWebAuthn }) => setWebauthnSupported(browserSupportsWebAuthn()))
      .catch(() => setWebauthnSupported(false));
  }, []);

  // ── Social OAuth (full-page redirects) ────────────────────────────────────
  const handleGoogleLogin = () => {
    if (!isApiConfigured) {
      onLogin(buildUser(Date.now(), 'Google User', '😎'));
      return;
    }
    window.location.href = `${BASE}/api/auth/google`;
  };

  const handleMicrosoftLogin = () => {
    if (!isApiConfigured) {
      onLogin(buildUser(Date.now(), 'Microsoft User', '😎'));
      return;
    }
    window.location.href = `${BASE}/api/auth/microsoft`;
  };

  // ── Email / password ───────────────────────────────────────────────────────
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (isSignup && !displayName.trim()) {
      setError('Please enter a display name');
      return;
    }
    if (isApiConfigured) {
      setLoading(true);
      try {
        if (isSignup) {
          const user = await apiSignup(email.trim(), password, displayName.trim(), selectedAvatar);
          onLogin(buildUser(user.id, user.username, user.avatar, { isAdmin: user.isAdmin }));
        } else {
          const user = await apiLogin(email.trim(), password);
          onLogin(buildUser(user.id, user.username, user.avatar, { isAdmin: user.isAdmin }));
        }
      } catch (err) {
        const isNetworkError = err instanceof TypeError && err.message === 'Failed to fetch';
        setError(isNetworkError
          ? 'Unable to reach the server. Please check your connection.'
          : err.message || 'Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      const name = (isSignup ? displayName.trim() : null) || email.split('@')[0] || email.trim();
      onLogin(buildUser(Date.now(), name, randomAvatar()));
    }
  };

  // ── Passkey sign-in ────────────────────────────────────────────────────────
  const handlePasskeyLogin = async () => {
    setError('');
    setPkLoading(true);
    try {
      const { startAuthentication } = await import('@simplewebauthn/browser');
      const { options, challengeToken } = await apiPasskeyLoginOptions();
      const authResp = await startAuthentication({ optionsJSON: options });
      const result = await apiPasskeyLoginVerify(challengeToken, authResp);
      onLogin(buildUser(result.user.id, result.user.username, result.user.avatar, { isAdmin: result.user.isAdmin }));
    } catch (err) {
      setError(
        err?.name === 'NotAllowedError'
          ? 'Passkey prompt was cancelled or timed out.'
          : err.message || 'Passkey sign-in failed.'
      );
    } finally {
      setPkLoading(false);
    }
  };

  // ── Passkey sign-up ────────────────────────────────────────────────────────
  const handlePasskeySignup = async (e) => {
    e.preventDefault();
    if (!pkEmail.trim() || !pkDisplayName.trim()) {
      setError('Email and display name are required');
      return;
    }
    setError('');
    setPkLoading(true);
    try {
      const { startRegistration } = await import('@simplewebauthn/browser');
      const { options, challengeToken } = await apiPasskeySignupOptions(pkEmail.trim(), pkDisplayName.trim(), pkAvatar);
      const attResp = await startRegistration({ optionsJSON: options });
      const result = await apiPasskeySignupVerify(challengeToken, attResp);
      onLogin(buildUser(result.user.id, result.user.username, result.user.avatar, { isAdmin: result.user.isAdmin }));
    } catch (err) {
      setError(
        err?.name === 'NotAllowedError'
          ? 'Passkey prompt was cancelled or timed out.'
          : err.message || 'Passkey registration failed.'
      );
    } finally {
      setPkLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="background-pattern"></div>
      </div>

      <div className="login-card">
        <div className="login-header">
          <h1 className="login-logo">🎵 BandLab Studio</h1>
          <p className="login-tagline">Collaborate. Create. Record.</p>
        </div>

        {/* ── Social + Passkey options ── */}
        <div className="social-buttons">
          <button className="social-btn google-btn" onClick={handleGoogleLogin} type="button">
            <GoogleIcon />
            Continue with Google
          </button>
          <button className="social-btn microsoft-btn" onClick={handleMicrosoftLogin} type="button">
            <MicrosoftIcon />
            Continue with Microsoft
          </button>
          {webauthnSupported && (
            <button
              className="social-btn passkey-btn"
              onClick={handlePasskeyLogin}
              disabled={pkLoading}
              type="button"
            >
              <span aria-hidden="true">🔑</span>
              {pkLoading ? 'Waiting for passkey…' : 'Sign in with Passkey'}
            </button>
          )}
        </div>

        {/* ── Passkey sign-up expansion ── */}
        {webauthnSupported && (
          <div className="passkey-signup-toggle">
            <button
              type="button"
              className="passkey-signup-link-btn"
              onClick={() => { setShowPasskeySignup(v => !v); setError(''); }}
            >
              {showPasskeySignup ? '▲ Cancel' : '🔑 New here? Create an account with a passkey →'}
            </button>
            {showPasskeySignup && (
              <form className="passkey-signup-form" onSubmit={handlePasskeySignup}>
                <div className="form-group">
                  <label htmlFor="pkDisplayName">Display Name</label>
                  <input
                    id="pkDisplayName"
                    type="text"
                    value={pkDisplayName}
                    onChange={e => { setPkDisplayName(e.target.value); setError(''); }}
                    placeholder="Your name in the band"
                    className="login-input"
                    autoComplete="nickname"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="pkEmail">Email</label>
                  <input
                    id="pkEmail"
                    type="email"
                    value={pkEmail}
                    onChange={e => { setPkEmail(e.target.value); setError(''); }}
                    placeholder="your@email.com"
                    className="login-input"
                    autoComplete="email"
                  />
                </div>
                <div className="form-group">
                  <label>Avatar</label>
                  <div className="avatar-picker">
                    {AVATARS.map(av => (
                      <button
                        key={av}
                        type="button"
                        className={`avatar-option${pkAvatar === av ? ' selected' : ''}`}
                        onClick={() => setPkAvatar(av)}
                        aria-label={`Select avatar ${av}`}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" className="social-btn passkey-btn" disabled={pkLoading}>
                  <span aria-hidden="true">🔑</span>
                  {pkLoading ? 'Setting up passkey…' : 'Create Account with Passkey'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── Divider ── */}
        <div className="login-divider">
          <span>or continue with email</span>
        </div>

        {/* ── Email / password form ── */}
        <form className="login-form" onSubmit={handleEmailSubmit}>
          {isSignup && (
            <>
              <div className="form-group">
                <label htmlFor="displayName">Display Name</label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={e => { setDisplayName(e.target.value); setError(''); }}
                  placeholder="Your name in the band"
                  className="login-input"
                  autoComplete="nickname"
                />
              </div>
              <div className="form-group">
                <label>Avatar</label>
                <div className="avatar-picker">
                  {AVATARS.map(av => (
                    <button
                      key={av}
                      type="button"
                      className={`avatar-option${selectedAvatar === av ? ' selected' : ''}`}
                      onClick={() => setSelectedAvatar(av)}
                      aria-label={`Select avatar ${av}`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              placeholder="your@email.com"
              className="login-input"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder={isSignup ? 'Create a password (6+ chars)' : 'Enter your password'}
              className="login-input"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Please wait…' : isSignup ? 'Create Account' : 'Sign In'}
          </button>

          {!isSignup && isApiConfigured && (
            <p className="stay-signed-in-note">You'll stay signed in for 7 days.</p>
          )}
        </form>

        <div className="auth-toggle">
          <button
            type="button"
            className="toggle-mode-button"
            onClick={() => { setIsSignup(v => !v); setError(''); }}
          >
            {isSignup ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>

      </div>
    </div>
  );
}

export default Login;
