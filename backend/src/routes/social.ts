import { Router } from 'express';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/players', async (req: AuthRequest, res) => {
  const q = (req.query.q as string) || '';
  const players = await prisma.user.findMany({
    where: {
      id: { not: req.userId },
      isBanned: false,
      ...(q ? { displayName: { contains: q, mode: 'insensitive' } } : {}),
    },
    select: {
      id: true,
      displayName: true,
      character: { select: { name: true, level: true } },
      farm: { select: { name: true, level: true } },
    },
    take: 20,
    orderBy: { lastLoginAt: 'desc' },
  });
  res.json({ players });
});

router.post('/friend/request', async (req: AuthRequest, res) => {
  const { friendId } = req.body;
  if (!friendId || friendId === req.userId) {
    return res.status(400).json({ error: 'invalid' });
  }
  const existing = await prisma.friendship.findUnique({
    where: { userId_friendId: { userId: req.userId!, friendId } },
  });
  if (existing) return res.status(400).json({ error: 'ส่งคำขอแล้ว' });

  const f = await prisma.friendship.create({
    data: { userId: req.userId!, friendId, status: 'accepted' }, // ง่าย: auto accept
  });
  res.json({ friendship: f });
});

router.get('/friends', async (req: AuthRequest, res) => {
  const list = await prisma.friendship.findMany({
    where: {
      OR: [
        { userId: req.userId, status: 'accepted' },
        { friendId: req.userId, status: 'accepted' },
      ],
    },
    include: {
      user: { select: { id: true, displayName: true, character: true, farm: true } },
      friend: { select: { id: true, displayName: true, character: true, farm: true } },
    },
  });
  res.json({ friendships: list });
});

/** เยี่ยมฟาร์มเพื่อน (ดูอย่างเดียว) */
router.get('/visit/:userId', async (req: AuthRequest, res) => {
  const farm = await prisma.farm.findUnique({
    where: { userId: req.params.userId },
    include: {
      plots: true,
      animals: true,
      decorations: true,
      user: { select: { displayName: true, character: true } },
    },
  });
  if (!farm) return res.status(404).json({ error: 'ไม่พบฟาร์ม' });
  res.json({ farm, readonly: true });
});

export default router;
