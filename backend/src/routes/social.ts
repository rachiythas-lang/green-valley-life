import { Router } from 'express';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

// ค้นหาผู้เล่น
router.get('/players', async (req: AuthRequest, res) => {
  const q = (req.query.q as string) || '';
  const players = await prisma.user.findMany({
    where: {
      id: { not: req.userId },
      displayName: { contains: q, mode: 'insensitive' },
      isBanned: false,
    },
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
      character: { select: { name: true, level: true } },
      farm: { select: { name: true, level: true } },
    },
    take: 20,
  });
  res.json({ players });
});

// ส่งคำขอเป็นเพื่อน
router.post('/friend/request', async (req: AuthRequest, res) => {
  const { friendId } = req.body;
  if (friendId === req.userId) {
    return res.status(400).json({ error: 'Cannot friend yourself' });
  }

  const existing = await prisma.friendship.findUnique({
    where: { userId_friendId: { userId: req.userId!, friendId } },
  });
  if (existing) return res.status(400).json({ error: 'Already requested' });

  const friendship = await prisma.friendship.create({
    data: { userId: req.userId!, friendId, status: 'pending' },
  });
  res.json({ friendship });
});

// ยอมรับเพื่อน
router.post('/friend/accept', async (req: AuthRequest, res) => {
  const { friendshipId } = req.body;
  const friendship = await prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: 'accepted' },
  });
  res.json({ friendship });
});

// รายชื่อเพื่อน
router.get('/friends', async (req: AuthRequest, res) => {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { userId: req.userId, status: 'accepted' },
        { friendId: req.userId, status: 'accepted' },
      ],
    },
    include: {
      user: { select: { id: true, displayName: true, avatarUrl: true, character: true } },
      friend: { select: { id: true, displayName: true, avatarUrl: true, character: true } },
    },
  });
  res.json({ friendships });
});

// ดูฟาร์มคนอื่น (visit)
router.get('/farm/:userId', async (req: AuthRequest, res) => {
  const farm = await prisma.farm.findUnique({
    where: { userId: req.params.userId },
    include: {
      plots: true,
      animals: true,
      house: true,
      user: { select: { displayName: true, character: true } },
    },
  });
  if (!farm) return res.status(404).json({ error: 'Farm not found' });
  res.json({ farm });
});

export default router;
