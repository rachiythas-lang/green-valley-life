import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.js';
import farmRoutes from './routes/farm.js';
import dailyRoutes from './routes/daily.js';
import questRoutes from './routes/quest.js';
import animalRoutes from './routes/animal.js';
import shopRoutes from './routes/shop.js';
import fishingRoutes from './routes/fishing.js';
import decorRoutes from './routes/decor.js';
import socialRoutes from './routes/social.js';
import worldRoutes from './routes/world.js';
import { authMiddleware } from './middleware/auth.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true },
});

export const prisma = new PrismaClient();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', game: 'Green Valley Life', version: '1.3.0-village' });
});

app.use('/api/auth', authRoutes);
app.use('/api/farm', authMiddleware, farmRoutes);
app.use('/api/daily', authMiddleware, dailyRoutes);
app.use('/api/quest', authMiddleware, questRoutes);
app.use('/api/animal', authMiddleware, animalRoutes);
app.use('/api/shop', authMiddleware, shopRoutes);
app.use('/api/fishing', authMiddleware, fishingRoutes);
app.use('/api/decor', authMiddleware, decorRoutes);
app.use('/api/social', authMiddleware, socialRoutes);
app.use('/api/world', authMiddleware, worldRoutes);

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Error' });
});

io.on('connection', (socket) => {
  console.log('player connected', socket.id);
  socket.on('disconnect', () => console.log('player left', socket.id));
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🌱 Green Valley Life Village API :${PORT}`);
});
