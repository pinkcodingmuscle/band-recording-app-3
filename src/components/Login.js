import React, { useState } from 'react';
import './Login.css';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AVATARS = ['😎', '🎸', '🎤', '🎹', '🥁', '🎵', '🎼', '🎧', '🎺', '🎷'];
const randomAvatar = () => AVATARS[Math.floor(Math.random() * AVATARS.length)];
const makeSessionId = () => 'sess' + Math.floor(10000 + Math.random() * 90000);

function buildUser(id, name, avatar) {
  const sessionId = makeSessionId();
  return { id, username: name, avatar, sessionId, displayName: `${name}-${sessionId}` };
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
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

    if (isSupabaseConfigured) {
      setLoading(true);
      try {
        if (isSignup) {
          const avatar = randomAvatar();
          const { data, error: err } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { data: { username: displayName.trim(), avatar } },
          });
          if (err) { setError(err.message); return; }
          if (data.user) {
            onLogin(buildUser(data.user.id, displayName.trim(), avatar));
          } else {
            setError('Check your email for a confirmation link before logging in.');
          }
        } else {
          const { data, error: err } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (err) { setError(err.message); return; }
          if (data.user) {
            const name = data.user.user_metadata?.username || email.split('@')[0];
            const avatar = data.user.user_metadata?.avatar || '😎';
            onLogin(buildUser(data.user.id, name, avatar));
          }
        }
      } catch {
        setError('Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      // Local fallback — no Supabase configured
      const name = (isSignup ? displayName.trim() : null) || email.split('@')[0] || email.trim();
      onLogin(buildUser(Date.now(), name, randomAvatar()));
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

        <form className="login-form" onSubmit={handleSubmit}>
          {isSignup && (
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

          <div className="login-divider">
            <span>or</span>
          </div>

          <button
            type="button"
            className="demo-login-button"
            onClick={() => onLogin(buildUser(Date.now(), 'Demo User', '😎'))}
          >
            Continue as Demo User
          </button>
        </form>

        <div className="login-footer">
          <button
            className="toggle-mode-button"
            onClick={() => { setIsSignup(!isSignup); setError(''); }}
          >
            {isSignup ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
