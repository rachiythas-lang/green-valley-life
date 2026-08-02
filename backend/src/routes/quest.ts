import { Router } from 'express';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

// ดึง daily quest + สร้าง progress ถ้ายังไม่มี
router.get('/daily', async (req: AuthRequest, res) => {
  const dailyQuests = await prisma.quest.findMany({
    where: { type: 'daily', isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  // ถ้ายังไม่มี quest ใน DB ให้สร้าง
  if (dailyQuests.length === 0) {
    const defaults = [
      {
        code: 'daily_plant_3',
        type: 'daily',
        titleTh: 'ปลูกพืช 3 แปลง',
        titleEn: 'Plant 3 crops',
        descriptionTh: 'ปลูกพืชใดก็ได้ 3 แปลง',
        descriptionEn: 'Plant any crop on 3 plots',
        requirements: { plant: 3 },
        rewards: { coin: 50, exp: 20 },
        sortOrder: 1,
      },
      {
        code: 'daily_harvest_5',
        type: 'daily',
        titleTh: 'เก็บเกี่ยว 5 ครั้ง',
        titleEn: 'Harvest 5 times',
        descriptionTh: 'เก็บเกี่ยวพืชผล 5 ครั้ง',
        descriptionEn: 'Harvest crops 5 times',
        requirements: { harvest: 5 },
        rewards: { coin: 80, exp: 30 },
        sortOrder: 2,
      },
      {
        code: 'daily_water_5',
        type: 'daily',
        titleTh: 'รดน้ำ 5 แปลง',
        titleEn: 'Water 5 plots',
        descriptionTh: 'รดน้ำพืช 5 แปลง',
        descriptionEn: 'Water 5 planted plots',
        requirements: { water: 5 },
        rewards: { coin: 40, exp: 15 },
        sortOrder: 3,
      },
      {
        code: 'daily_feed_animal',
        type: 'daily',
        titleTh: 'ให้อาหารสัตว์ 1 ครั้ง',
        titleEn: 'Feed an animal',
        descriptionTh: 'ให้อาหารสัตว์อย่างน้อย 1 ตัว',
        descriptionEn: 'Feed at least 1 animal',
        requirements: { feed: 1 },
        rewards: { coin: 30, exp: 10 },
        sortOrder: 4,
      },
    ];
    for (const q of defaults) {
      await prisma.quest.upsert({
        where: { code: q.code },
        create: q as any,
        update: {},
      });
    }
  }

  const quests = await prisma.quest.findMany({
    where: { type: 'daily', isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  // สร้าง UserQuest ถ้ายังไม่มีวันนี้ (ใช้ status active)
  for (const q of quests) {
    await prisma.userQuest.upsert({
      where: { userId_questId: { userId: req.userId!, questId: q.id } },
      create: {
        userId: req.userId!,
        questId: q.id,
        progress: {},
        status: 'active',
      },
      update: {},
    });
  }

  const userQuests = await prisma.userQuest.findMany({
    where: { userId: req.userId, quest: { type: 'daily' } },
    include: { quest: true },
  });

  res.json({ quests, userQuests });
});

// อัปเดต progress (เรียกจาก farm/animal actions)
router.post('/progress', async (req: AuthRequest, res) => {
  const { action, amount = 1 } = req.body; // plant, harvest, water, feed
  if (!action) return res.status(400).json({ error: 'action required' });

  const userQuests = await prisma.userQuest.findMany({
    where: { userId: req.userId, status: 'active', quest: { type: 'daily' } },
    include: { quest: true },
  });

  const updated = [];
  for (const uq of userQuests) {
    const reqs = uq.quest.requirements as Record<string, number>;
    if (!(action in reqs)) continue;

    const progress = (uq.progress as Record<string, number>) || {};
    progress[action] = (progress[action] || 0) + amount;

    let status = uq.status;
    // เช็คว่าครบทุก requirement หรือยัง
    const done = Object.entries(reqs).every(([k, v]) => (progress[k] || 0) >= v);
    if (done) status = 'completed';

    const result = await prisma.userQuest.update({
      where: { id: uq.id },
      data: {
        progress,
        status,
        completedAt: done ? new Date() : null,
      },
      include: { quest: true },
    });
    updated.push(result);
  }

  res.json({ updated });
});

// รับรางวัล
router.post('/claim/:questId', async (req: AuthRequest, res) => {
  const { questId } = req.params;
  const userQuest = await prisma.userQuest.findUnique({
    where: { userId_questId: { userId: req.userId!, questId } },
    include: { quest: true },
  });

  if (!userQuest) return res.status(404).json({ error: 'Quest not found' });
  if (userQuest.status !== 'completed') {
    return res.status(400).json({ error: 'Quest not completed yet' });
  }

  const rewards = userQuest.quest.rewards as any;

  if (rewards.coin) {
    await prisma.inventoryItem.upsert({
      where: { userId_itemId: { userId: req.userId!, itemId: 'coin' } },
      create: { userId: req.userId!, itemId: 'coin', quantity: rewards.coin },
      update: { quantity: { increment: rewards.coin } },
    });
  }
  if (rewards.exp) {
    await prisma.character.update({
      where: { userId: req.userId },
      data: { experience: { increment: rewards.exp } },
    });
  }

  await prisma.userQuest.update({
    where: { id: userQuest.id },
    data: { status: 'claimed', claimedAt: new Date() },
  });

  res.json({ ok: true, rewards });
});

export default router;
