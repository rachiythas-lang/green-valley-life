import { Router } from 'express';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

const DEFAULT_QUESTS = [
  {
    code: 'plant_tomato_3',
    type: 'daily',
    titleTh: 'ปลูกมะเขือเทศ 3 แปลง',
    titleEn: 'Plant 3 tomatoes',
    descriptionTh: 'มิ้นท์อยากได้มะเขือเทศสด ๆ ช่วยปลูกให้หน่อยนะ',
    descriptionEn: 'Mint wants fresh tomatoes',
    requirements: { plant_tomato: 3 },
    rewards: { coin: 80, exp: 20 },
    sortOrder: 1,
  },
  {
    code: 'harvest_5',
    type: 'daily',
    titleTh: 'เก็บเกี่ยว 5 ครั้ง',
    titleEn: 'Harvest 5 times',
    descriptionTh: 'ลุงปลาบอกว่าเก็บเกี่ยวเยอะ ๆ จะมีแรงไปตกปลา',
    descriptionEn: 'Harvest crops 5 times',
    requirements: { harvest: 5 },
    rewards: { coin: 100, exp: 25 },
    sortOrder: 2,
  },
  {
    code: 'collect_egg',
    type: 'daily',
    titleTh: 'เก็บไข่ไก่ 1 ฟอง',
    titleEn: 'Collect 1 egg',
    descriptionTh: 'ไก่ออกไข่แล้ว ไปเก็บหน่อยสิ',
    descriptionEn: 'Collect an egg from chickens',
    requirements: { collect_egg: 1 },
    rewards: { coin: 40, exp: 10 },
    sortOrder: 3,
  },
];

async function ensureQuests() {
  for (const q of DEFAULT_QUESTS) {
    await prisma.quest.upsert({
      where: { code: q.code },
      create: q as any,
      update: {},
    });
  }
}

router.get('/daily', async (req: AuthRequest, res) => {
  await ensureQuests();
  const quests = await prisma.quest.findMany({
    where: { type: 'daily', isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  for (const q of quests) {
    await prisma.userQuest.upsert({
      where: { userId_questId: { userId: req.userId!, questId: q.id } },
      create: { userId: req.userId!, questId: q.id, progress: {}, status: 'active' },
      update: {},
    });
  }

  const userQuests = await prisma.userQuest.findMany({
    where: { userId: req.userId, quest: { type: 'daily' } },
    include: { quest: true },
  });

  res.json({ quests, userQuests });
});

/** เรียกจาก farm/animal เมื่อทำ action */
export async function bumpQuest(userId: string, action: string, amount = 1) {
  try {
    const userQuests = await prisma.userQuest.findMany({
      where: { userId, status: 'active', quest: { type: 'daily' } },
      include: { quest: true },
    });
    for (const uq of userQuests) {
      const reqs = uq.quest.requirements as Record<string, number>;
      if (!(action in reqs)) continue;
      const progress = { ...((uq.progress as Record<string, number>) || {}) };
      progress[action] = (progress[action] || 0) + amount;
      const done = Object.entries(reqs).every(([k, v]) => (progress[k] || 0) >= v);
      await prisma.userQuest.update({
        where: { id: uq.id },
        data: {
          progress,
          status: done ? 'completed' : 'active',
          completedAt: done ? new Date() : null,
        },
      });
    }
  } catch (e) {
    console.warn('quest bump', e);
  }
}

router.post('/claim/:questId', async (req: AuthRequest, res) => {
  const uq = await prisma.userQuest.findUnique({
    where: { userId_questId: { userId: req.userId!, questId: req.params.questId } },
    include: { quest: true },
  });
  if (!uq || uq.status !== 'completed') {
    return res.status(400).json({ error: 'เควสยังไม่เสร็จ' });
  }
  const rewards = uq.quest.rewards as any;
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
    where: { id: uq.id },
    data: { status: 'claimed', claimedAt: new Date() },
  });
  res.json({ ok: true, rewards });
});

export default router;
