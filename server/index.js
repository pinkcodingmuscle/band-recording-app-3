import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import connectDB from './db.js';
import authRouter from './routes/auth.js';
import tracksRouter from './routes/tracks.js';
import audioRouter from './routes/audio.js';
import commentsRouter from './routes/comments.js';
import chatRouter from './routes/chat.js';
import setlistRouter from './routes/setlist.js';
import initSocket from './socket/index.js';

await connectDB();

const app = express();
const httpServer = http.createServer(app);

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, credentials: true },
});

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

app.get('/', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRouter);
app.use('/api/tracks', tracksRouter);
app.use('/api/audio', audioRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/setlist', setlistRouter);

initSocket(io);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`BandLab server running on http://localhost:${PORT}`));
