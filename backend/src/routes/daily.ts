import { Router } from 'express';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

/** รางวัล 7 วัน (วนใหม่เมื่อครบ) */
const REWARDS = [
  { day: 1, itemId: 'coin', qty: 50, label: '50 เหรียญ' },
  { day: 2, itemId: 'seed_tomato', qty: 5, label: 'เมล็ดมะเขือ x5' },
  { day: 3, itemId: 'coin', qty: 100, label: '100 เหรียญ' },
  { day: 4, itemId: 'seed_carrot', qty: 5, label: 'เมล็ดแครอท x5' },
  { day: 5, itemId: 'decor_bench', qty: 1, label: 'ม้านั่ง' },
  { day: 6, itemId: 'coin', qty: 150, label: '150 เหรียญ' },
  { day: 7, itemId: 'decor_fountain', qty: 1, label: 'น้ำพุเล็ก + 200 เหรียญ' },
];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

router.get('/', async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: 'Not found' });

  const now = new Date();
  const claimedToday = user.lastDailyClaim ? sameDay(new Date(user.lastDailyClaim), now) : false;
  const currentDay = claimedToday ? user.dailyClaimDay : (user.dailyClaimDay % 7) + 1;

  res.json({
    rewards: REWARDS,
    currentDay: user.dailyClaimDay === 0 ? 1 : currentDay,
    claimedToday,
    nextDay: claimedToday ? (user.dailyClaimDay % 7) + 1 : user.dailyClaimDay === 0 ? 1 : (user.dailyClaimDay % 7) + 1,
    loginStreak: user.loginStreak,
  });
});

router.post('/claim', async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: 'Not found' });

  const now = new Date();
  if (user.lastDailyClaim && sameDay(new Date(user.lastDailyClaim), now)) {
    return res.status(400).json({ error: 'รับรางวัลวันนี้ไปแล้ว' });
  }

  const nextDay = user.dailyClaimDay >= 7 ? 1 : user.dailyClaimDay + 1;
  const reward = REWARDS.find((r) => r.day === nextDay) || REWARDS[0];

  await prisma.inventoryItem.upsert({
    where: { userId_itemId: { userId: req.userId!, itemId: reward.itemId } },
    create: { userId: req.userId!, itemId: reward.itemId, quantity: reward.qty },
    update: { quantity: { increment: reward.qty } },
  });

  // วันที่ 7 ได้เหรียญเพิ่ม
  if (nextDay === 7) {
    await prisma.inventoryItem.upsert({
      where: { userId_itemId: { userId: req.userId!, itemId: 'coin' } },
      create: { userId: req.userId!, itemId: 'coin', quantity: 200 },
      update: { quantity: { increment: 200 } },
    });
  }

  await prisma.user.update({
    where: { id: req.userId },
    data: { dailyClaimDay: nextDay, lastDailyClaim: now },
  });

  res.json({ ok: true, day: nextDay, reward });
});

export default router;
