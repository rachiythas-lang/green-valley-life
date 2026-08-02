import { Router } from 'express';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

// อันดับตาม level ตัวละคร
router.get('/level', async (_req, res) => {
  const list = await prisma.character.findMany({
    orderBy: [{ level: 'desc' }, { experience: 'desc' }],
    take: 20,
    include: {
      user: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  });
  res.json({
    ranking: list.map((c, i) => ({
      rank: i + 1,
      userId: c.userId,
      name: c.name,
      displayName: c.user.displayName,
      level: c.level,
      experience: c.experience,
    })),
  });
});

// อันดับตามเงิน
router.get('/money', async (_req, res) => {
  const coins = await prisma.inventoryItem.findMany({
    where: { itemId: 'coin' },
    orderBy: { quantity: 'desc' },
    take: 20,
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          character: { select: { name: true, level: true } },
        },
      },
    },
  });
  res.json({
    ranking: coins.map((c, i) => ({
      rank: i + 1,
      userId: c.userId,
      displayName: c.user.displayName,
      characterName: c.user.character?.name,
      level: c.user.character?.level,
      coins: c.quantity,
    })),
  });
});

// อันดับฟาร์ม (ตาม level ฟาร์ม)
router.get('/farm', async (_req, res) => {
  const farms = await prisma.farm.findMany({
    orderBy: { level: 'desc' },
    take: 20,
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          character: { select: { name: true, level: true } },
        },
      },
    },
  });
  res.json({
    ranking: farms.map((f, i) => ({
      rank: i + 1,
      userId: f.userId,
      farmName: f.name,
      displayName: f.user.displayName,
      farmLevel: f.level,
      characterLevel: f.user.character?.level,
    })),
  });
});

// profile ตัวเองแบบสรุป
router.get('/profile', async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: {
      character: true,
      farm: { include: { animals: true, plots: true, house: true } },
      inventory: true,
    },
  });
  if (!user) return res.status(404).json({ error: 'Not found' });

  const coin = user.inventory.find((i) => i.itemId === 'coin')?.quantity || 0;
  const readyPlots = user.farm?.plots.filter((p) => p.state === 'ready').length || 0;

  res.json({
    profile: {
      id: user.id,
      displayName: user.displayName,
      character: user.character,
      farm: {
        name: user.farm?.name,
        level: user.farm?.level,
        animalCount: user.farm?.animals.length || 0,
        plotCount: user.farm?.plots.length || 0,
        readyCrops: readyPlots,
        houseLevel: user.farm?.house?.level || 1,
      },
      coins: coin,
      inventoryCount: user.inventory.length,
    },
  });
});

export default router;
