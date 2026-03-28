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
import { CommentsProvider } from './context/CommentsContext';
import { BandProvider, useBand } from './context/BandContext';
import { isApiConfigured, apiMe, apiLogout } from './lib/api';

// ── AppShell ──────────────────────────────────────────────────────────────────
// Rendered inside BandProvider so it can call useBand().
function AppShell({ currentUser, theme, toggleTheme, onLogout }) {
  const { userBand, pendingApplicationCount, userPendingApp, refreshBands, withdrawApplication } = useBand();

  const [activeSession, setActiveSession] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSidebar, setShowSidebar] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
  const [bannerDismissed, setBannerDismissed] = useState(false);

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
    const baseDate = new Date();
    setSessions([
      {
        id: 1,
        name: `${currentUser.username}'s Recording Session`,
        date: baseDate.toISOString().split('T')[0],
        tracks: 3,
        status: 'active',
        collaborators: bandMembers.length,
        duration: '2:34',
        sessionId: currentUser.sessionId,
      },
      {
        id: 2,
        name: 'Collaborative Jam',
        date: new Date(baseDate - 86400000 * 2).toISOString().split('T')[0],
        tracks: 5,
        status: 'active',
        collaborators: 3,
        duration: '4:12',
        sessionId: 'sess' + Math.floor(10000 + Math.random() * 90000),
      },
      {
        id: 3,
        name: 'Practice & Rehearsal',
        date: new Date(baseDate - 86400000 * 5).toISOString().split('T')[0],
        tracks: 2,
        status: 'completed',
        collaborators: 2,
        duration: '3:05',
        sessionId: 'sess' + Math.floor(10000 + Math.random() * 90000),
      },
    ]);
  }, [currentUser?.id]);

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

  // Re-show banner if user's band status changes (e.g. they just left a band)
  useEffect(() => {
    if (!userBand) setBannerDismissed(false);
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
            <button className="banner-dismiss" onClick={() => setBannerDismissed(true)} title="Dismiss">✕</button>
          </div>
        )}

        {/* Top Navigation Bar */}
        <nav className="top-nav">
          <div className="nav-left">
            <button className="menu-toggle" onClick={() => setShowSidebar(!showSidebar)}>
              ☰
            </button>
            <h1 className="app-logo">🎵 BandLab Studio</h1>
            <div className="session-info">
              <span className="session-label">Session:</span>
              <span className="session-id">{currentUser.sessionId}</span>
            </div>
          </div>

          <div className="nav-tabs">
            <button
              className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <span className="tab-icon">🏠</span><span className="tab-label">Home</span>
            </button>
            <button
              className={`nav-tab ${activeTab === 'calendar' ? 'active' : ''}`}
              onClick={() => setActiveTab('calendar')}
            >
              <span className="tab-icon">📅</span><span className="tab-label">Calendar</span>
            </button>
            <button
              className={`nav-tab ${activeTab === 'setlist' ? 'active' : ''}`}
              onClick={() => setActiveTab('setlist')}
            >
              <span className="tab-icon">🎵</span><span className="tab-label">Setlist</span>
            </button>
            <button
              className={`nav-tab ${activeTab === 'studio' ? 'active' : ''}`}
              onClick={() => setActiveTab('studio')}
            >
              <span className="tab-icon">🎙️</span><span className="tab-label">Studio</span>
            </button>
            <button
              className={`nav-tab ${activeTab === 'projects' ? 'active' : ''}`}
              onClick={() => setActiveTab('projects')}
            >
              <span className="tab-icon">📁</span><span className="tab-label">Projects</span>
            </button>
            <button
              className={`nav-tab ${activeTab === 'community' ? 'active' : ''}`}
              onClick={() => setActiveTab('community')}
            >
              <span className="tab-icon">👥</span><span className="tab-label">Band</span>
              {pendingApplicationCount > 0 && (
                <span className="tab-notify-dot">{pendingApplicationCount}</span>
              )}
            </button>
            <button
              className={`nav-tab ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <span className="tab-icon">💬</span><span className="tab-label">Chat</span>
            </button>
          </div>

          <div className="nav-right">
            <button
              className="nav-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button className="nav-btn notification-bell" title="Notifications">
              🔔
              {pendingApplicationCount > 0 && (
                <span className="notification-badge">{pendingApplicationCount}</span>
              )}
            </button>
            <button className="nav-btn">⚙️</button>
            <div className="user-profile">
              <span className="user-name">{currentUser.username}</span>
              <span className="user-session-id">{currentUser.sessionId}</span>
            </div>
            <button className="logout-btn" onClick={onLogout} title="Logout">
              🚪
            </button>
          </div>
        </nav>

        {isMobile && showSidebar && (
          <div className="sidebar-backdrop" onClick={() => setShowSidebar(false)} />
        )}

        <div className="app-workspace">
          {/* Sidebar */}
          {showSidebar && (
            <aside className={`sidebar${isMobile ? ' sidebar-overlay' : ''}`}>
              {activeTab === 'studio' && (
                <Sessions
                  sessions={sessions}
                  activeSession={activeSession}
                  onSelectSession={setActiveSession}
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
                />
              )}
            </aside>
          )}

          {/* Main Content Area */}
          <main className="main-content">
            {activeTab === 'dashboard' && (
              <Dashboard currentUser={currentUser} users={bandMembers} />
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
          </main>

          {/* Right Panel — Studio only (only when in a band) */}
          {activeTab === 'studio' && userBand && (
            <aside className="right-sidebar">
              <Chat users={bandMembers} compact={true} />
            </aside>
          )}
        </div>
      </div>
    </CommentsProvider>
  );
}

// ── App (auth + theme owner) ──────────────────────────────────────────────────
function App() {
  const [currentUser, setCurrentUser] = useState(null);
  // True while we check for an existing JWT session on page load
  const [authLoading, setAuthLoading] = useState(isApiConfigured);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Restore existing session from JWT stored in localStorage
  useEffect(() => {
    if (!isApiConfigured) return;
    apiMe().then((user) => {
      if (user) {
        const sessionId = 'sess' + Math.floor(10000 + Math.random() * 90000);
        setCurrentUser({
          id: user.id,
          username: user.username,
          avatar: user.avatar,
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
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '1.2rem' }}>Loading…</div>;
  }

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

  return (
    <BandProvider currentUser={currentUser}>
      <AppShell
        currentUser={currentUser}
        theme={theme}
        toggleTheme={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
        onLogout={handleLogout}
      />
    </BandProvider>
  );
}

export default App;
