import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth.js';
import characterRoutes from './routes/character.js';
import farmRoutes from './routes/farm.js';
import questRoutes from './routes/quest.js';
import socialRoutes from './routes/social.js';
import animalRoutes from './routes/animal.js';
import shopRoutes from './routes/shop.js';
import houseRoutes from './routes/house.js';
import rankingRoutes from './routes/ranking.js';
import fishingRoutes from './routes/fishing.js';
import miningRoutes from './routes/mining.js';
import craftRoutes from './routes/craft.js';
import itemsRoutes from './routes/items.js';
import { setupSocket } from './socket/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

export const prisma = new PrismaClient();
export { io };

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', game: 'Green Valley Life', version: '1.0.0-mvp', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/character', authMiddleware, characterRoutes);
app.use('/api/farm', authMiddleware, farmRoutes);
app.use('/api/quest', authMiddleware, questRoutes);
app.use('/api/social', authMiddleware, socialRoutes);
app.use('/api/animal', authMiddleware, animalRoutes);
app.use('/api/shop', authMiddleware, shopRoutes);
app.use('/api/house', authMiddleware, houseRoutes);
app.use('/api/ranking', authMiddleware, rankingRoutes);
app.use('/api/fishing', authMiddleware, fishingRoutes);
app.use('/api/mining', authMiddleware, miningRoutes);
app.use('/api/craft', authMiddleware, craftRoutes);
app.use('/api/items', authMiddleware, itemsRoutes);

app.use(errorHandler);

setupSocket(io);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🌱 Green Valley Life Backend v0.2 running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO ready | Animals, Shop, House, Quests, Ranking enabled`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
