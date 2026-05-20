# 🎸 Band Recording App

A modern, collaborative music band recording application built with React. This app allows band members to manage recording sessions, communicate in real-time, and record tracks together.

## ✨ Features

### 📅 Session Management
- View and manage multiple recording sessions
- Track session status (active/completed)
- See number of tracks per session
- Select active sessions for recording

### 👥 Band Members
- Display all band members with their roles
- Real-time status indicators (online/away/offline)
- Visual avatars for each member
- Role-based organization (Guitarist, Vocalist, Drummer, etc.)

### 💬 Real-Time Chat
- Live chat interface for band communication
- Message history
- Timestamp tracking
- User avatars in messages
- Online member count

### 🎙️ Recording Studio
- Start/stop recording functionality
- Multi-track recording support
- Track playback controls
- Visual waveform representations
- Track management (play, mute, delete)
- Built-in mixer with volume, reverb, and EQ controls
- Recording time tracker

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository or navigate to the project directory:
```bash
cd band-recording-app-3
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

## 📁 Project Structure

```
band-recording-app-3/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Sessions.js
│   │   ├── Sessions.css
│   │   ├── Users.js
│   │   ├── Users.css
│   │   ├── Chat.js
│   │   ├── Chat.css
│   │   ├── Recording.js
│   │   └── Recording.css
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   └── index.css
├── package.json
└── README.md
```

## 🎨 Component Overview

### App Component
Main application component that orchestrates all features and manages global state.

### Sessions Component
Displays recording sessions with metadata including date, track count, and status.

### Users Component
Shows band members with their roles and real-time status indicators.

### Chat Component
Provides a messaging interface for band members to communicate.

### Recording Component
Main recording interface with controls for recording, playback, and mixing.

## 🛠️ Technologies Used

- **React** - Frontend framework
- **CSS3** - Styling with gradients and animations
- **React Hooks** - State management (useState, useEffect, useRef)

## 📝 Available Scripts

- `npm start` - Runs the app in development mode
- `npm build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm eject` - Ejects from Create React App (one-way operation)

## 🚢 Deployment

### Live URLs
- **Frontend (Vercel):** https://band-recording-app-3.vercel.app
- **Backend (Railway):** https://band-recording-app-3-production.up.railway.app

### Services Used
| Service | Purpose |
|---|---|
| [Vercel](https://vercel.com) | Frontend hosting (Vite/React) |
| [Railway](https://railway.app) | Backend hosting (Express + Socket.IO) |
| [MongoDB Atlas](https://cloud.mongodb.com) | Database (cluster: `cluster0.n4fivmd.mongodb.net`) |
| [Supabase](https://supabase.com) | Audio file storage |

### Environment Variables

**Frontend — Vercel Project Settings → Environment Variables:**
```
VITE_API_URL=https://band-recording-app-3-production.up.railway.app
VITE_SUPABASE_URL=https://tfrekbhgzbidsezotpvl.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase anon key>
```

**Backend — Railway Service → Variables:**
```
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.n4fivmd.mongodb.net/bandlab?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=<strong random secret, min 64 chars>
PORT=4000
CLIENT_ORIGIN=https://band-recording-app-3.vercel.app
SUPABASE_URL=https://tfrekbhgzbidsezotpvl.supabase.co
SUPABASE_SERVICE_KEY=<supabase service role key>
```

**Local development — `server/.env`:**
```
MONGO_URI=mongodb+srv://...    # Atlas URI
JWT_SECRET=...
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
SUPABASE_URL=https://tfrekbhgzbidsezotpvl.supabase.co
SUPABASE_SERVICE_KEY=...
```

**Local development — `.env` (root):**
```
VITE_API_URL=http://localhost:4000
```

### Railway Configuration
- **Root Directory:** `server/`
- **Start command:** `node index.js` (set in `server/railway.toml`)

## 🎯 Future Enhancements

- WebRTC integration for real-time audio streaming
- Waveform visualization with actual audio data
- Export tracks in various formats
- Collaborative mixing features
- Mobile responsive design improvements

## 📄 License

This project is open source and available for educational purposes.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!


