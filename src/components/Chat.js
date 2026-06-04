import React, { useState, useEffect } from 'react';
import './Chat.css';
import { isApiConfigured, getSocket, apiGetChatHistory } from '../lib/api';

function Chat({ users, compact = false, fullScreen = false, currentUser }) {
  // Generate initial messages from actual band members (used as fallback when Supabase isn't configured)
  const [messages, setMessages] = useState(() => {
    if (isApiConfigured) return [];

    const initialMessages = [];
    const messageTemplates = [
      'Ready to start recording!',
      'Great session today!',
      'Can someone review the latest track?',
      'Let\'s collaborate on this!',
      'Sounds amazing! 🎵',
      'When should we schedule the next session?'
    ];

    initialMessages.push({
      id: 1,
      user: 'System',
      text: `${currentUser?.username} joined the session ${currentUser?.sessionId}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatar: '🔔',
      type: 'notification'
    });

    users.slice(1, 4).forEach((user, index) => {
      initialMessages.push({
        id: index + 2,
        user: user.displayName || user.name,
        text: messageTemplates[index % messageTemplates.length],
        time: new Date(Date.now() - (5 - index) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        avatar: user.avatar,
        type: 'message'
      });
    });

    return initialMessages;
  });
  
  const [newMessage, setNewMessage] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // ── Load chat history from API and subscribe to new messages via Socket.io ──
  useEffect(() => {
    if (!isApiConfigured || !currentUser?.sessionId) return;

    apiGetChatHistory(currentUser.sessionId).then((data) => {
      if (data && data.length > 0) setMessages(data);
    });

    const socket = getSocket();
    if (!socket) return;

    socket.emit('join-session', currentUser.sessionId);

    const onMessage = (m) => {
      // Skip own messages already added optimistically
      if (m.user === (currentUser.displayName || currentUser.username)) return;
      setMessages(prev => [...prev, m]);
    };
    socket.on('chat-message', onMessage);
    return () => socket.off('chat-message', onMessage);
  }, [currentUser?.sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        setNotificationsEnabled(true);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          setNotificationsEnabled(permission === 'granted');
        });
      }
    }
  }, []);

  // Monitor new messages and trigger notifications
  useEffect(() => {
    if (messages.length > 6) { // Initial messages are 6
      const latestMessage = messages[messages.length - 1];
      if (latestMessage.user !== 'You') {
        setUnreadCount(prev => prev + 1);
        
        // Play notification sound
        playNotificationSound();
        
        // Show browser notification
        if (notificationsEnabled && document.hidden) {
          showBrowserNotification(latestMessage);
        }
      }
    }
  }, [messages, notificationsEnabled]);

  const playNotificationSound = () => {
    // Create a simple notification beep
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  const showBrowserNotification = (message) => {
    if (notificationsEnabled) {
      const notification = new Notification('BandLab Studio - New Message', {
        body: `${message.user}: ${message.text}`,
        icon: '🎵',
        tag: 'chat-message',
        requireInteraction: false
      });
      
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      
      setTimeout(() => notification.close(), 5000);
    }
  };

  const toggleNotifications = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications');
      return;
    }

    if (Notification.permission === 'denied') {
      alert('Notifications are blocked. Please enable them in your browser settings.');
      return;
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
      if (permission === 'granted') {
        new Notification('BandLab Studio', {
          body: 'Notifications enabled! You\'ll be notified of new messages.',
          icon: '🎵'
        });
      }
    } else if (Notification.permission === 'granted') {
      setNotificationsEnabled(!notificationsEnabled);
      if (!notificationsEnabled) {
        new Notification('BandLab Studio', {
          body: 'Notifications enabled!',
          icon: '🎵'
        });
      }
    }
  };

  const clearUnreadCount = () => {
    setUnreadCount(0);
  };



  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      const message = {
        id: messages.length + 1,
        user: currentUser?.displayName || 'You',
        text: newMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        avatar: currentUser?.avatar || '😎',
        type: 'message'
      };
      setMessages([...messages, message]);
      setNewMessage('');
      setShowMentions(false);

      if (isApiConfigured && currentUser) {
        const socket = getSocket();
        if (socket) {
          socket.emit('chat-message', {
            sessionId: currentUser.sessionId,
            authorId: currentUser.id,
            authorName: currentUser.displayName || currentUser.username,
            authorAvatar: currentUser.avatar || '😎',
            text: newMessage.trim(),
          });
        }
      }
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);
    // Show mention suggestions when @ is typed
    if (value.endsWith('@')) {
      setShowMentions(true);
    } else if (!value.includes('@')) {
      setShowMentions(false);
    }
  };

  const mentionUser = (userName) => {
    setNewMessage(newMessage.replace(/@$/, `@${userName} `));
    setShowMentions(false);
  };

  const containerClass = fullScreen ? 'chat-container fullscreen' : compact ? 'chat-container compact' : 'chat-container';

  const onlineUsers = users.filter(user => user.status === 'online').length;

  // Compute message grouping: consecutive messages from the same user are grouped
  const groupedMessages = messages.map((msg, i) => {
    const prev = messages[i - 1];
    const isGrouped =
      prev &&
      prev.type === 'message' &&
      msg.type === 'message' &&
      prev.user === msg.user;
    return { ...msg, isGrouped };
  });

  const isOwn = (msg) =>
    msg.user === currentUser?.displayName || msg.user === 'You';

  return (
    <div className={containerClass} onClick={clearUnreadCount}>
      <div className="chat-header">
        <h2>💬 {fullScreen ? 'Band Chat' : 'Chat'} {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}</h2>
        <div className="chat-header-actions">
          <span className="online-count" title="Online members">
            {onlineUsers} online
          </span>
          <button 
            className={`icon-btn ${notificationsEnabled ? 'notifications-active' : ''}`} 
            onClick={toggleNotifications}
            title={notificationsEnabled ? 'Notifications enabled (click to disable)' : 'Enable notifications'}
            aria-label={notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
          >
            {notificationsEnabled ? '🔔' : '🔕'}
          </button>
          {fullScreen && (
            <button className="icon-btn" title="Call" aria-label="Start call">📞</button>
          )}
        </div>
      </div>
      
      <div className="messages-container">
        {groupedMessages.map(message => (
          <div 
            key={message.id} 
            className={`message ${isOwn(message) ? 'own-message' : ''} ${message.type === 'notification' ? 'notification-message' : ''} ${message.isGrouped ? 'grouped' : ''}`}
          >
            {message.type === 'notification' ? (
              <div className="notification-content">
                <span className="notification-icon">{message.avatar}</span>
                <span className="notification-text">{message.text}</span>
                <span className="notification-time">{message.time}</span>
              </div>
            ) : (
              <>
                <div className="message-avatar">
                  {message.isGrouped ? null : message.avatar}
                </div>
                <div className="message-content">
                  {!message.isGrouped && (
                    <div className="message-header">
                      <span className="message-user">{message.user}</span>
                      <span className="message-time">{message.time}</span>
                    </div>
                  )}
                  <p className="message-text">{message.text}</p>
                  {fullScreen && !message.isGrouped && (
                    <div className="message-actions">
                      <button className="message-action-btn" aria-label="Like">👍</button>
                      <button className="message-action-btn" aria-label="Reply">💬</button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {showMentions && (
        <div className="mentions-popup">
          {users.filter(u => u.status === 'online').map(user => (
            <button 
              key={user.id}
              className="mention-option"
              onClick={() => mentionUser(user.name)}
            >
              <span className="mention-avatar">{user.avatar}</span>
              <span className="mention-name">{user.name}</span>
            </button>
          ))}
        </div>
      )}

      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <button type="button" className="attach-btn" title="Attach file">
          📎
        </button>
        <input
          type="text"
          placeholder="Type a message... (use @ to mention)"
          value={newMessage}
          onChange={handleInputChange}
          className="chat-input"
        />
        <button type="button" className="emoji-btn" title="Add emoji">
          😊
        </button>
        <button type="submit" className="send-button">
          ➤
        </button>
      </form>
    </div>
  );
}

export default Chat;
