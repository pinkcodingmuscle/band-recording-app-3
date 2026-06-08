import React, { useState, useEffect } from 'react';
import './App.css';
import Sessions from './components/Sessions';
import Chat from './components/Chat';
import Recording from './components/Recording';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Setlist from './components/Setlist';
import BandCalendar from './components/BandCalendar';
import BandSetup from './components/BandSetup';
import BandRoster from './components/BandRoster';
import BandApplications from './components/BandApplications';
import FeedbackButton from './components/FeedbackButton';
import AdminFeedbackReview from './components/AdminFeedbackReview';
import { CommentsProvider } from './context/CommentsContext';
import { BandProvider, useBand } from './context/BandContext';
import { ToastProvider } from './context/ToastContext';
import { isApiConfigured, apiMe, apiLogout, apiGetSessions, apiCreateSession, apiJoinSession, setToken } from './lib/api';

// ── AppShell ──────────────────────────────────────────────────────────────────
// Rendered inside BandProvider so it can call useBand().
function AppShell({ currentUser, theme, toggleTheme, onLogout }) {
  const { userBand, pendingApplicationCount, userPendingApp, refreshBands, withdrawApplication } = useBand();

  const [activeSession, setActiveSession] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSidebar, setShowSidebar] = useState(() => window.innerWidth > 768);
  const [sessions, setSessions] = useState([]);
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try { return localStorage.getItem('bannerDismissed') === 'true'; } catch { return false; }
  });
  const [sessionModal, setSessionModal] = useState(null); // 'create' | 'join'
  const [sessionModalInput, setSessionModalInput] = useState('');
  const [sessionModalError, setSessionModalError] = useState('');
  const [sessionModalLoading, setSessionModalLoading] = useState(false);

  // Derive real members from the band roster
  const bandMembers = userBand
    ? userBand.positions
        .filter(p => p.filledBy)
        .map(p => ({
          id: p.filledBy,
          name: p.filledByName,
          role: p.title,
          avatar: p.filledByAvatar || '🎵',
          status: p.filledBy === currentUser.id ? 'online' : 'away',
          sessionId: currentUser.sessionId,
          displayName: p.filledByName,
        }))
    : [];

  useEffect(() => {
    if (!currentUser) return;
    if (isApiConfigured) {
      apiGetSessions().then(data => {
        if (data && data.length > 0) {
          setSessions(data);
          setActiveSession(prev => prev ?? data[0]);
        }
      });
    } else {
      // Local fallback
      const baseDate = new Date();
      const fallback = [
        {
          id: 1,
          name: `${currentUser.username}'s Recording Session`,
          date: baseDate.toISOString().split('T')[0],
          tracks: 3, status: 'active', collaborators: 1, duration: '0:00',
          sessionId: currentUser.sessionId,
        },
      ];
      setSessions(fallback);
      setActiveSession(fallback[0]);
    }
  }, [currentUser?.id]);

  const handleCreateSession = () => {
    setSessionModal('create');
    setSessionModalInput('');
    setSessionModalError('');
  };

  const handleJoinSession = () => {
    setSessionModal('join');
    setSessionModalInput('');
    setSessionModalError('');
  };

  const handleSessionModalSubmit = async () => {
    if (!sessionModalInput.trim()) {
      setSessionModalError(sessionModal === 'create' ? 'Enter a project name.' : 'Enter a Session ID.');
      return;
    }
    setSessionModalLoading(true);
    setSessionModalError('');
    if (sessionModal === 'create') {
      if (isApiConfigured) {
        try {
          const session = await apiCreateSession(sessionModalInput.trim());
          setSessions(prev => [session, ...prev]);
          setActiveSession(session);
          setActiveTab('studio');
          setSessionModal(null);
        } catch (err) {
          setSessionModalError(err.message);
          setSessionModalLoading(false);
        }
      } else {
        const session = {
          id: Date.now(), name: sessionModalInput.trim(),
          date: new Date().toISOString().split('T')[0],
          tracks: 0, status: 'active', collaborators: 1, duration: '0:00',
          sessionId: 'sess' + Date.now(),
        };
        setSessions(prev => [session, ...prev]);
        setActiveSession(session);
        setActiveTab('studio');
        setSessionModal(null);
        setSessionModalLoading(false);
      }
    } else {
      if (!isApiConfigured) {
        setSessionModalError('Join requires a live backend connection.');
        setSessionModalLoading(false);
        return;
      }
      try {
        const session = await apiJoinSession(sessionModalInput.trim());
        setSessions(prev => {
          const exists = prev.some(s => s.id === session.id);
          return exists ? prev : [session, ...prev];
        });
        setActiveSession(session);
        setActiveTab('studio');
        setSessionModal(null);
      } catch (err) {
        setSessionModalError(err.message);
        setSessionModalLoading(false);
      }
    }
  };

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setWindowWidth(w);
      if (w < 768) setShowSidebar(false);
    };
    if (window.innerWidth < 768) setShowSidebar(false);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const activeTabHasSidebar = activeTab === 'studio' || activeTab === 'projects' || (activeTab === 'community' && !!userBand);

  // Persist banner dismissed state across page loads
  useEffect(() => {
    try { localStorage.setItem('bannerDismissed', String(bannerDismissed)); } catch {}
  }, [bannerDismissed]);

  // Re-show banner if user's band status changes (e.g. they just left a band)
  useEffect(() => {
    if (!userBand) {
      setBannerDismissed(false);
      try { localStorage.removeItem('bannerDismissed'); } catch {}
    }
  }, [userBand?.id]);

  return (
    <CommentsProvider currentUser={currentUser}>
      <div className="App">
        {/* Band status banner — shown when user has no confirmed band position */}
        {!userBand && !bannerDismissed && (
          <div className="band-status-banner">
            <div className="band-status-banner-content">
              {userPendingApp ? (
                <>
                  <span className="banner-icon">⏳</span>
                  <span className="banner-text">
                    Your application to <strong>{userPendingApp.bandName}</strong> ({userPendingApp.positionEmoji} {userPendingApp.positionTitle}) is pending approval.
                  </span>
                  <button className="banner-btn" onClick={refreshBands}>🔄 Check Status</button>
                  <button
                    className="banner-btn danger"
                    onClick={() => withdrawApplication(userPendingApp.bandId, userPendingApp.id)}
                  >
                    Withdraw
                  </button>
                </>
              ) : (
                <>
                  <span className="banner-icon">🎸</span>
                  <span className="banner-text">You're not in a band yet. Join or create one to unlock all features.</span>
                  <button className="banner-btn" onClick={() => setActiveTab('community')}>Find a Band →</button>
                </>
              )}
            </div>
            <button className="banner-dismiss" aria-label="Dismiss banner" onClick={() => setBannerDismissed(true)} title="Dismiss">✕</button>
          </div>
        )}

        {/* Top Navigation Bar */}
        <nav className="top-nav">
          <div className="nav-left">
            {activeTabHasSidebar && (
              <button className="menu-toggle" aria-label="Toggle sidebar" onClick={() => setShowSidebar(!showSidebar)}>
                ☰
              </button>
            )}
            <h1 className="app-logo">🎵 BandLab Studio</h1>
          </div>

          <div className="nav-tabs">
            <button
              className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              aria-label="Home"
              onClick={() => setActiveTab('dashboard')}
            >
              <span className="tab-icon">🏠</span><span className="tab-label">Home</span>
            </button>
            <button
              className={`nav-tab ${activeTab === 'calendar' ? 'active' : ''}`}
              aria-label="Calendar"
              onClick={() => setActiveTab('calendar')}
            >
              <span className="tab-icon">📅</span><span className="tab-label">Calendar</span>
            </button>
            <button
              className={`nav-tab ${activeTab === 'setlist' ? 'active' : ''}`}
              aria-label="Setlist"
              onClick={() => setActiveTab('setlist')}
            >
              <span className="tab-icon">🎵</span><span className="tab-label">Setlist</span>
            </button>
            <button
              className={`nav-tab ${activeTab === 'studio' ? 'active' : ''}`}
              aria-label="Studio"
              onClick={() => setActiveTab('studio')}
            >
              <span className="tab-icon">🎙️</span><span className="tab-label">Studio</span>
            </button>
            <button
              className={`nav-tab ${activeTab === 'projects' ? 'active' : ''}`}
              aria-label="Projects"
              onClick={() => setActiveTab('projects')}
            >
              <span className="tab-icon">📁</span><span className="tab-label">Projects</span>
            </button>
            <button
              className={`nav-tab ${activeTab === 'community' ? 'active' : ''}`}
              aria-label={`Band${pendingApplicationCount > 0 ? ` (${pendingApplicationCount} pending)` : ''}`}
              onClick={() => setActiveTab('community')}
            >
              <span className="tab-icon">👥</span><span className="tab-label">Band</span>
            </button>
            <button
              className={`nav-tab ${activeTab === 'chat' ? 'active' : ''}`}
              aria-label="Chat"
              onClick={() => setActiveTab('chat')}
            >
              <span className="tab-icon">💬</span><span className="tab-label">Chat</span>
            </button>
            {currentUser?.isAdmin && (
              <button
                className={`nav-tab ${activeTab === 'admin-feedback' ? 'active' : ''}`}
                aria-label="Admin Feedback"
                onClick={() => setActiveTab('admin-feedback')}
              >
                <span className="tab-icon">🛠️</span><span className="tab-label">Admin</span>
              </button>
            )}
          </div>

          <div className="nav-right">
            <button
              className="nav-btn"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button
              className="nav-btn notification-bell"
              aria-label={pendingApplicationCount > 0 ? `Notifications (${pendingApplicationCount})` : 'Notifications'}
              title="Notifications"
              onClick={() => setActiveTab('community')}
            >
              🔔
              {pendingApplicationCount > 0 && (
                <span className="notification-badge" aria-hidden="true">{pendingApplicationCount}</span>
              )}
            </button>
            <div className="user-profile">
              <span className="user-name">{currentUser.username}</span>
            </div>
            <button className="logout-btn" aria-label="Logout" onClick={onLogout} title="Logout">
              🚪
            </button>
          </div>
        </nav>

        {isMobile && showSidebar && (
          <div className="sidebar-backdrop" onClick={() => setShowSidebar(false)} />
        )}

        <div className="app-workspace">
          {/* Sidebar */}
          {showSidebar && activeTabHasSidebar && (
            <aside className={`sidebar${isMobile ? ' sidebar-overlay' : ''}`}>
              {activeTab === 'studio' && (
                <Sessions
                  sessions={sessions}
                  activeSession={activeSession}
                  onSelectSession={setActiveSession}
                  onNewSession={handleCreateSession}
                  onJoinSession={handleJoinSession}
                />
              )}
              {activeTab === 'community' && userBand && (
                <BandApplications currentUser={currentUser} />
              )}
              {activeTab === 'projects' && (
                <Sessions
                  sessions={sessions}
                  activeSession={activeSession}
                  onSelectSession={setActiveSession}
                  onNewSession={handleCreateSession}
                  onJoinSession={handleJoinSession}
                />
              )}
            </aside>
          )}

          {/* Main Content Area */}
          <main className="main-content">
            {activeTab === 'dashboard' && (
              <Dashboard currentUser={currentUser} users={bandMembers} onNavigate={setActiveTab} />
            )}
            {activeTab === 'calendar' && <BandCalendar />}
            {activeTab === 'setlist' && <Setlist currentUser={currentUser} />}
            {activeTab === 'studio' && (
              userBand
                ? <Recording activeSession={activeSession} currentUser={currentUser} />
                : (
                  <div className="tab-locked">
                    <span className="tab-locked-icon">🎙️</span>
                    <h2>Studio is locked</h2>
                    <p>Join or create a band to start recording sessions with your bandmates.</p>
                    <button className="tab-locked-btn" onClick={() => setActiveTab('community')}>Find a Band →</button>
                  </div>
                )
            )}
            {activeTab === 'projects' && (
              <div className="projects-view">
                <Sessions
                  sessions={sessions}
                  activeSession={activeSession}
                  onSelectSession={setActiveSession}
                  onNewSession={handleCreateSession}
                  onJoinSession={handleJoinSession}
                  viewMode="grid"
                />
              </div>
            )}
            {activeTab === 'community' && (
              userBand
                ? <BandRoster currentUser={currentUser} />
                : <BandSetup currentUser={currentUser} inline />
            )}
            {activeTab === 'chat' && (
              userBand
                ? <Chat users={bandMembers} fullScreen={true} />
                : (
                  <div className="tab-locked">
                    <span className="tab-locked-icon">💬</span>
                    <h2>Chat is locked</h2>
                    <p>Join a band to chat with your bandmates in real time.</p>
                    <button className="tab-locked-btn" onClick={() => setActiveTab('community')}>Find a Band →</button>
                  </div>
                )
            )}
            {activeTab === 'admin-feedback' && currentUser?.isAdmin && <AdminFeedbackReview />}
          </main>

          {/* Right Panel — Studio only (only when in a band) */}
          {activeTab === 'studio' && userBand && (
            <aside className="right-sidebar">
              <Chat users={bandMembers} compact={true} />
            </aside>
          )}
        </div>
        {/* Session Modal */}
        {sessionModal && (
          <div
            className="session-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={sessionModal === 'create' ? 'New Project' : 'Join Session'}
            onClick={() => setSessionModal(null)}
          >
            <div className="session-modal" onClick={e => e.stopPropagation()}>
              <h2 className="session-modal-title">
                {sessionModal === 'create' ? 'New Project' : 'Join Session'}
              </h2>
              <input
                className="session-modal-input"
                type="text"
                placeholder={sessionModal === 'create' ? 'Project name…' : 'Session ID…'}
                value={sessionModalInput}
                onChange={e => setSessionModalInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSessionModalSubmit()}
                autoFocus
              />
              {sessionModalError && (
                <p className="session-modal-error" role="alert">{sessionModalError}</p>
              )}
              <div className="session-modal-actions">
                <button className="session-modal-cancel" onClick={() => setSessionModal(null)}>Cancel</button>
                <button
                  className="session-modal-confirm"
                  onClick={handleSessionModalSubmit}
                  disabled={sessionModalLoading}
                >
                  {sessionModalLoading ? 'Working…' : sessionModal === 'create' ? 'Create' : 'Join'}
                </button>
              </div>
            </div>
          </div>
        )}

        <FeedbackButton activeTab={activeTab} />
      </div>
    </CommentsProvider>
  );
}

// ── App (auth + theme owner) ──────────────────────────────────────────────────
function App() {
  const [currentUser, setCurrentUser] = useState(null);
  // True while we check for an existing JWT session on page load
  const [authLoading, setAuthLoading] = useState(isApiConfigured);
  const [loginError, setLoginError] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Restore existing session from JWT stored in localStorage (also handles OAuth redirects)
  useEffect(() => {
    // Consume ?token= or ?error= from OAuth redirects before anything else
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get('token');
    const oauthError = params.get('error');
    if (oauthToken || oauthError) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (oauthToken) setToken(oauthToken);
    if (oauthError) setLoginError(decodeURIComponent(oauthError));

    if (!isApiConfigured) {
      setAuthLoading(false);
      return;
    }
    apiMe().then((user) => {
      if (user) {
        const sessionId = 'sess' + Math.floor(10000 + Math.random() * 90000);
        setCurrentUser({
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          isAdmin: user.isAdmin === true,
          sessionId,
          displayName: `${user.username}-${sessionId}`,
        });
      }
      setAuthLoading(false);
    });
  }, []);

  const handleLogout = () => {
    apiLogout();
    setCurrentUser(null);
  };

  if (authLoading) {
    return (
      <ToastProvider>
        <div className="app-loading">
          <div className="app-loading-logo">🎵</div>
          <div className="app-loading-name">BandLab Studio</div>
          <div className="app-loading-spinner" role="status" aria-label="Loading" />
        </div>
      </ToastProvider>
    );
  }

  if (!currentUser) {
    return (
      <ToastProvider>
        <Login onLogin={setCurrentUser} initialError={loginError} />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <BandProvider currentUser={currentUser}>
        <AppShell
          currentUser={currentUser}
          theme={theme}
          toggleTheme={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
          onLogout={handleLogout}
        />
      </BandProvider>
    </ToastProvider>
  );
}

export default App;
