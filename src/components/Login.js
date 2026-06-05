import React, { useState, useEffect } from 'react';
import './Login.css';
import {
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

function buildUser(id, name, avatar) {
  const sessionId = makeSessionId();
  return { id, username: name, avatar, sessionId, displayName: `${name}-${sessionId}` };
}

function Login({ onLogin }) {
  // ── Tab ────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('email'); // 'email' | 'passkey'

  // ── Email / password state ─────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(randomAvatar);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Passkey state ──────────────────────────────────────────────────────────
  const [pkMode, setPkMode] = useState('login');       // 'login' | 'signup'
  const [pkEmail, setPkEmail] = useState('');
  const [pkDisplayName, setPkDisplayName] = useState('');
  const [pkAvatar, setPkAvatar] = useState(randomAvatar);
  const [pkError, setPkError] = useState('');
  const [pkLoading, setPkLoading] = useState(false);
  const [webauthnSupported, setWebauthnSupported] = useState(true);

  useEffect(() => {
    import('@simplewebauthn/browser')
      .then(({ browserSupportsWebAuthn }) => setWebauthnSupported(browserSupportsWebAuthn()))
      .catch(() => setWebauthnSupported(false));
  }, []);

  // ── Email / password handlers ──────────────────────────────────────────────
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
          onLogin(buildUser(user.id, user.username, user.avatar));
        } else {
          const user = await apiLogin(email.trim(), password);
          onLogin(buildUser(user.id, user.username, user.avatar));
        }
      } catch (err) {
        const isNetworkError = err instanceof TypeError && err.message === 'Failed to fetch';
        setError(isNetworkError
          ? 'Unable to reach the server. Please check your connection or try again shortly.'
          : err.message || 'Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      const name = (isSignup ? displayName.trim() : null) || email.split('@')[0] || email.trim();
      onLogin(buildUser(Date.now(), name, randomAvatar()));
    }
  };

  // ── Passkey handlers ───────────────────────────────────────────────────────
  const handlePasskeyLogin = async () => {
    setPkError('');
    setPkLoading(true);
    try {
      const { startAuthentication } = await import('@simplewebauthn/browser');
      const { options, challengeToken } = await apiPasskeyLoginOptions();
      const authResp = await startAuthentication({ optionsJSON: options });
      const result = await apiPasskeyLoginVerify(challengeToken, authResp);
      onLogin(buildUser(result.user.id, result.user.username, result.user.avatar));
    } catch (err) {
      setPkError(
        err?.name === 'NotAllowedError'
          ? 'Passkey prompt was cancelled or timed out.'
          : err.message || 'Passkey sign-in failed.'
      );
    } finally {
      setPkLoading(false);
    }
  };

  const handlePasskeySignup = async () => {
    if (!pkEmail.trim() || !pkDisplayName.trim()) {
      setPkError('Email and display name are required');
      return;
    }
    setPkError('');
    setPkLoading(true);
    try {
      const { startRegistration } = await import('@simplewebauthn/browser');
      const { options, challengeToken } = await apiPasskeySignupOptions(
        pkEmail.trim(), pkDisplayName.trim(), pkAvatar
      );
      const attResp = await startRegistration({ optionsJSON: options });
      const result = await apiPasskeySignupVerify(challengeToken, attResp);
      onLogin(buildUser(result.user.id, result.user.username, result.user.avatar));
    } catch (err) {
      setPkError(
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

        {/* ── Tabs ── */}
        <div className="login-tabs">
          <button
            className={`login-tab${activeTab === 'email' ? ' active' : ''}`}
            onClick={() => { setActiveTab('email'); setError(''); }}
            type="button"
          >
            ✉️ Email
          </button>
          {webauthnSupported && (
            <button
              className={`login-tab${activeTab === 'passkey' ? ' active' : ''}`}
              onClick={() => { setActiveTab('passkey'); setPkError(''); }}
              type="button"
            >
              🔑 Passkey
            </button>
          )}
        </div>

        {/* ── Email / password panel ── */}
        {activeTab === 'email' && (
          <form className="login-form" onSubmit={handleEmailSubmit}>
            {isSignup && (
              <>
                <div className="form-group">
                  <label htmlFor="displayName">Display Name</label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => { setDisplayName(e.target.value); setError(''); }}
                    placeholder="Your name in the band"
                    className="login-input"
                    autoComplete="nickname"
                  />
                </div>
                <div className="form-group">
                  <label>Choose Your Avatar</label>
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
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="Enter your email"
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
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter your password"
                className="login-input"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? 'Please wait…' : isSignup ? 'Sign Up' : 'Log In'}
            </button>

            {!isSignup && isApiConfigured && (
              <p className="stay-signed-in-note">You'll stay signed in for 7 days.</p>
            )}

            <div className="login-footer-inline">
              <button
                type="button"
                className="toggle-mode-button"
                onClick={() => { setIsSignup(!isSignup); setError(''); }}
              >
                {isSignup ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </form>
        )}

        {/* ── Passkey panel ── */}
        {activeTab === 'passkey' && (
          <div className="passkey-panel">
            <div className="passkey-mode-toggle">
              <button
                type="button"
                className={`pk-mode-btn${pkMode === 'login' ? ' active' : ''}`}
                onClick={() => { setPkMode('login'); setPkError(''); }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`pk-mode-btn${pkMode === 'signup' ? ' active' : ''}`}
                onClick={() => { setPkMode('signup'); setPkError(''); }}
              >
                Create Account
              </button>
            </div>

            {pkMode === 'login' ? (
              <div className="passkey-login-section">
                <p className="passkey-hint">
                  Use a passkey saved on this device — no password needed.
                </p>
                <button
                  type="button"
                  className="passkey-button"
                  onClick={handlePasskeyLogin}
                  disabled={pkLoading}
                >
                  {pkLoading ? 'Waiting for passkey…' : '🔑 Sign In with Passkey'}
                </button>
              </div>
            ) : (
              <form
                className="login-form"
                onSubmit={(e) => { e.preventDefault(); handlePasskeySignup(); }}
              >
                <div className="form-group">
                  <label htmlFor="pkDisplayName">Display Name</label>
                  <input
                    id="pkDisplayName"
                    type="text"
                    value={pkDisplayName}
                    onChange={(e) => { setPkDisplayName(e.target.value); setPkError(''); }}
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
                    onChange={(e) => { setPkEmail(e.target.value); setPkError(''); }}
                    placeholder="Enter your email"
                    className="login-input"
                    autoComplete="email"
                  />
                </div>
                <div className="form-group">
                  <label>Choose Your Avatar</label>
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
                <button
                  type="submit"
                  className="passkey-button"
                  disabled={pkLoading}
                >
                  {pkLoading ? 'Setting up passkey…' : '🔑 Create Account with Passkey'}
                </button>
              </form>
            )}

            {pkError && <div className="error-message" style={{ marginTop: '12px' }}>{pkError}</div>}
          </div>
        )}

        {/* ── Demo button (always visible) ── */}
        <div className="demo-section">
          <div className="login-divider"><span>or</span></div>
          <button
            type="button"
            className="demo-login-button"
            onClick={() => onLogin(buildUser(Date.now(), 'Demo User', '😎'))}
          >
            Continue as Demo User
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;

