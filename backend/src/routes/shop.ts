import { Router } from 'express';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

const ITEMS = [
  { id: 'seed_tomato', nameTh: 'เมล็ดมะเขือเทศ', buy: 12, sell: 0 },
  { id: 'seed_carrot', nameTh: 'เมล็ดแครอท', buy: 10, sell: 0 },
  { id: 'seed_wheat', nameTh: 'เมล็ดข้าวสาลี', buy: 8, sell: 0 },
  { id: 'seed_potato', nameTh: 'เมล็ดมันฝรั่ง', buy: 11, sell: 0 },
  { id: 'crop_tomato', nameTh: 'มะเขือเทศ', buy: 0, sell: 25 },
  { id: 'crop_carrot', nameTh: 'แครอท', buy: 0, sell: 18 },
  { id: 'crop_wheat', nameTh: 'ข้าวสาลี', buy: 0, sell: 15 },
  { id: 'crop_potato', nameTh: 'มันฝรั่ง', buy: 0, sell: 20 },
  { id: 'egg', nameTh: 'ไข่ไก่', buy: 0, sell: 20 },
  { id: 'milk', nameTh: 'นม', buy: 0, sell: 45 },
  { id: 'fish_carp', nameTh: 'ปลาตะเพียน', buy: 0, sell: 30 },
  { id: 'decor_bench', nameTh: 'ม้านั่ง', buy: 80, sell: 0 },
  { id: 'decor_fence', nameTh: 'รั้ว', buy: 40, sell: 0 },
  { id: 'decor_flower', nameTh: 'กระถางดอกไม้', buy: 50, sell: 0 },
  { id: 'decor_lamp', nameTh: 'โคมไฟ', buy: 90, sell: 0 },
];

router.get('/', (_req, res) => res.json({ items: ITEMS }));

router.post('/buy', async (req: AuthRequest, res) => {
  const { itemId, quantity = 1 } = z
    .object({ itemId: z.string(), quantity: z.number().int().min(1).max(50).default(1) })
    .parse(req.body);
  const item = ITEMS.find((i) => i.id === itemId && i.buy > 0);
  if (!item) return res.status(400).json({ error: 'ซื้อไม่ได้' });

  const total = item.buy * quantity;
  const coin = await prisma.inventoryItem.findUnique({
    where: { userId_itemId: { userId: req.userId!, itemId: 'coin' } },
  });
  if (!coin || coin.quantity < total) return res.status(400).json({ error: 'เหรียญไม่พอ' });

  await prisma.inventoryItem.update({ where: { id: coin.id }, data: { quantity: { decrement: total } } });
  await prisma.inventoryItem.upsert({
    where: { userId_itemId: { userId: req.userId!, itemId } },
    create: { userId: req.userId!, itemId, quantity },
    update: { quantity: { increment: quantity } },
  });
  res.json({ ok: true, spent: total });
});

router.post('/sell', async (req: AuthRequest, res) => {
  const { itemId, quantity = 1 } = z
    .object({ itemId: z.string(), quantity: z.number().int().min(1).max(99).default(1) })
    .parse(req.body);
  const item = ITEMS.find((i) => i.id === itemId && i.sell > 0);
  if (!item) return res.status(400).json({ error: 'ขายไม่ได้' });

  const inv = await prisma.inventoryItem.findUnique({
    where: { userId_itemId: { userId: req.userId!, itemId } },
  });
  if (!inv || inv.quantity < quantity) return res.status(400).json({ error: 'ของไม่พอ' });

  const earned = item.sell * quantity;
  await prisma.inventoryItem.update({ where: { id: inv.id }, data: { quantity: { decrement: quantity } } });
  await prisma.inventoryItem.upsert({
    where: { userId_itemId: { userId: req.userId!, itemId: 'coin' } },
    create: { userId: req.userId!, itemId: 'coin', quantity: earned },
    update: { quantity: { increment: earned } },
  });
  res.json({ ok: true, earned });
});

export default router;
