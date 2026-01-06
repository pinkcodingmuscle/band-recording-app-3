import React, { useState } from 'react';
import './Login.css';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Generate random session ID
    const sessionId = 'sess' + Math.floor(10000 + Math.random() * 90000);
    
    // Random avatar selection
    const avatars = ['😎', '🎸', '🎤', '🎹', '🥁', '🎵', '🎼', '🎧', '🎺', '🎷'];
    const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];

    // Simulate authentication (in real app, this would call an API)
    const user = {
      username: username.trim(),
      avatar: randomAvatar,
      id: Date.now(),
      sessionId: sessionId,
      displayName: `${username.trim()}-${sessionId}`
    };

    onLogin(user);
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
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder="Enter your username"
              className="login-input"
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Enter your password"
              className="login-input"
              autoComplete={isSignup ? "new-password" : "current-password"}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button">
            {isSignup ? 'Sign Up' : 'Log In'}
          </button>

          <div className="login-divider">
            <span>or</span>
          </div>

          <button type="button" className="demo-login-button" onClick={() => {
            const sessionId = 'sess' + Math.floor(10000 + Math.random() * 90000);
            const demoUser = {
              username: 'Demo User',
              avatar: '😎',
              id: Date.now(),
              sessionId: sessionId,
              displayName: `DemoUser-${sessionId}`
            };
            onLogin(demoUser);
          }}>
            Continue as Demo User
          </button>
        </form>

        <div className="login-footer">
          <button 
            className="toggle-mode-button"
            onClick={() => setIsSignup(!isSignup)}
          >
            {isSignup ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
