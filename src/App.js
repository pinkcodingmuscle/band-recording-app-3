import React, { useState, useEffect } from 'react';
import './App.css';
import Sessions from './components/Sessions';
import Users from './components/Users';
import Chat from './components/Chat';
import Recording from './components/Recording';
import Login from './components/Login';

function App() {
  const [activeSession, setActiveSession] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [activeTab, setActiveTab] = useState('studio');
  const [showSidebar, setShowSidebar] = useState(true);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (!savedUser) {
      return null;
    }

    try {
      return JSON.parse(savedUser);
    } catch (error) {
      localStorage.removeItem('currentUser');
      return null;
    }
  });
  const [notificationCount, setNotificationCount] = useState(0);

  // Generate dynamic session-based data
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!currentUser) return;

    // Generate sessions
    const baseDate = new Date();
    const newSessions = [
      { 
        id: 1, 
        name: `${currentUser.username}'s Recording Session`, 
        date: baseDate.toISOString().split('T')[0], 
        tracks: Math.floor(2 + Math.random() * 4), 
        status: 'active', 
        collaborators: Math.floor(2 + Math.random() * 4), 
        duration: `${Math.floor(2 + Math.random() * 4)}:${Math.floor(10 + Math.random() * 50)}`,
        sessionId: currentUser.sessionId
      },
      { 
        id: 2, 
        name: 'Collaborative Jam', 
        date: new Date(baseDate - 86400000 * 2).toISOString().split('T')[0], 
        tracks: Math.floor(3 + Math.random() * 5), 
        status: 'active', 
        collaborators: Math.floor(3 + Math.random() * 3), 
        duration: `${Math.floor(3 + Math.random() * 3)}:${Math.floor(10 + Math.random() * 50)}`,
        sessionId: 'sess' + Math.floor(10000 + Math.random() * 90000)
      },
      { 
        id: 3, 
        name: 'Practice & Rehearsal', 
        date: new Date(baseDate - 86400000 * 5).toISOString().split('T')[0], 
        tracks: Math.floor(2 + Math.random() * 3), 
        status: 'completed', 
        collaborators: Math.floor(2 + Math.random() * 3), 
        duration: `${Math.floor(2 + Math.random() * 3)}:${Math.floor(10 + Math.random() * 50)}`,
        sessionId: 'sess' + Math.floor(10000 + Math.random() * 90000)
      }
    ];
    setSessions(newSessions);

    // Generate users
    const roles = ['Lead Guitarist', 'Vocalist', 'Drummer', 'Bassist', 'Keyboardist', 'Saxophonist', 'Producer'];
    const avatars = ['🎸', '🎤', '🥁', '🎵', '🎹', '🎺', '🎧'];
    const statuses = ['online', 'online', 'online', 'away', 'offline'];
    const names = ['Alex Chen', 'Sarah Johnson', 'Mike Davis', 'Emma Wilson', 'Tom Martinez', 'Lisa Park', 'James Brown'];
    
    // Always include current user
    const bandMembers = [
      {
        id: currentUser.id,
        name: currentUser.username,
        role: 'Session Owner',
        status: 'online',
        avatar: currentUser.avatar,
        tracks: 0,
        collaborations: 0,
        sessionId: currentUser.sessionId,
        displayName: currentUser.displayName
      }
    ];

    // Generate 3-5 random band members
    const numMembers = Math.floor(3 + Math.random() * 3);
    for (let i = 0; i < numMembers; i++) {
      const name = names[i % names.length];
      const sessionId = 'sess' + Math.floor(10000 + Math.random() * 90000);
      bandMembers.push({
        id: Date.now() + i,
        name: name,
        role: roles[i % roles.length],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        avatar: avatars[i % avatars.length],
        tracks: Math.floor(5 + Math.random() * 15),
        collaborations: Math.floor(3 + Math.random() * 10),
        sessionId: sessionId,
        displayName: `${name.replace(' ', '')}-${sessionId}`
      });
    }

    setUsers(bandMembers);
  }, [currentUser]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSessions([]);
    setUsers([]);
    setActiveSession(null);
    setActiveTab('studio');
    setNotificationCount(0);
  };

  // Show login screen if not authenticated
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="App">
      {/* Top Navigation Bar */}
      <nav className="top-nav">
        <div className="nav-left">
          <button className="menu-toggle" onClick={() => setShowSidebar(!showSidebar)} title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}>
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
            className={`nav-tab ${activeTab === 'studio' ? 'active' : ''}`}
            onClick={() => setActiveTab('studio')}
            title="Open Studio tab"
          >
            <span className="tab-icon">🎙️</span>
            Studio
          </button>
          <button 
            className={`nav-tab ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('projects')}
            title="Open Projects tab"
          >
            <span className="tab-icon">📁</span>
            Projects
          </button>
          <button 
            className={`nav-tab ${activeTab === 'community' ? 'active' : ''}`}
            onClick={() => setActiveTab('community')}
            title="Open Band tab"
          >
            <span className="tab-icon">👥</span>
            Band
          </button>
          <button 
            className={`nav-tab ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
            title="Open Chat tab"
          >
            <span className="tab-icon">💬</span>
            Chat
          </button>
        </div>

        <div className="nav-right">
          <button className="nav-btn" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="nav-btn notification-bell" title="Notifications">
            🔔
            {notificationCount > 0 && <span className="notification-badge">{notificationCount}</span>}
          </button>
          <button className="nav-btn" title="Settings">⚙️</button>
          <div className="user-profile">
            <span className="user-name">{currentUser.username}</span>
            <span className="user-session-id">{currentUser.sessionId}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            🚪
          </button>
        </div>
      </nav>

      <div className="app-workspace">
        {/* Sidebar */}
        {showSidebar && (
          <aside className="sidebar">
            {activeTab === 'studio' && (
              <>
                <Sessions 
                  sessions={sessions} 
                  activeSession={activeSession}
                  onSelectSession={setActiveSession}
                />
              </>
            )}
            {activeTab === 'community' && (
              <Users users={users} />
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
          {activeTab === 'studio' && (
            <Recording 
              isRecording={isRecording}
              setIsRecording={setIsRecording}
              activeSession={activeSession}
            />
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
            <div className="community-view">
              <Users users={users} viewMode="detailed" />
            </div>
          )}
          {activeTab === 'chat' && (
            <Chat users={users} fullScreen={true} />
          )}
        </main>

        {/* Right Panel - Context Sensitive */}
        {activeTab === 'studio' && (
          <aside className="right-sidebar">
            <Chat users={users} compact={true} />
          </aside>
        )}
      </div>
    </div>
  );
}

export default App;
