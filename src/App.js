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
import { supabase, isSupabaseConfigured } from './lib/supabase';

// ── AppShell ──────────────────────────────────────────────────────────────────
// Rendered inside BandProvider so it can call useBand().
function AppShell({ currentUser, theme, toggleTheme, onLogout }) {
  const { userBand, pendingApplicationCount } = useBand();

  const [activeSession, setActiveSession] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSidebar, setShowSidebar] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);

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

  // Band gate — show onboarding if user has no confirmed position
  if (!userBand) {
    return <BandSetup currentUser={currentUser} />;
  }

  return (
    <CommentsProvider currentUser={currentUser}>
      <div className="App">
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
              {activeTab === 'community' && (
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
              <Recording activeSession={activeSession} currentUser={currentUser} />
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
              <BandRoster currentUser={currentUser} />
            )}
            {activeTab === 'chat' && (
              <Chat users={bandMembers} fullScreen={true} />
            )}
          </main>

          {/* Right Panel — Studio only */}
          {activeTab === 'studio' && (
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
  // True while we check for an existing Supabase session on page load
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Restore existing Supabase session after page refresh
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        const name = u.user_metadata?.username || u.email?.split('@')[0] || 'User';
        const avatar = u.user_metadata?.avatar || '😎';
        const sessionId = 'sess' + Math.floor(10000 + Math.random() * 90000);
        setCurrentUser({ id: u.id, username: name, email: u.email, avatar, sessionId, displayName: `${name}-${sessionId}` });
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setCurrentUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
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
