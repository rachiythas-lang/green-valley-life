import { Router } from 'express';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

const CATALOG = [
  { id: 'decor_bench', nameTh: 'ม้านั่ง', emoji: '🪑' },
  { id: 'decor_fence', nameTh: 'รั้ว', emoji: '🪵' },
  { id: 'decor_flower', nameTh: 'กระถางดอกไม้', emoji: '🌸' },
  { id: 'decor_lamp', nameTh: 'โคมไฟ', emoji: '🏮' },
  { id: 'decor_fountain', nameTh: 'น้ำพุ', emoji: '⛲' },
];

router.get('/', async (req: AuthRequest, res) => {
  const farm = await prisma.farm.findUnique({
    where: { userId: req.userId },
    include: { decorations: true },
  });
  if (!farm) return res.status(404).json({ error: 'Farm not found' });
  res.json({ decorations: farm.decorations, catalog: CATALOG });
});

router.post('/place', async (req: AuthRequest, res) => {
  const { itemId, x, y } = z
    .object({ itemId: z.string(), x: z.number(), y: z.number() })
    .parse(req.body);

  if (!CATALOG.find((c) => c.id === itemId)) {
    return res.status(400).json({ error: 'ของตกแต่งไม่รู้จัก' });
  }

  const inv = await prisma.inventoryItem.findUnique({
    where: { userId_itemId: { userId: req.userId!, itemId } },
  });
  if (!inv || inv.quantity < 1) return res.status(400).json({ error: 'ไม่มีของชิ้นนี้ในกระเป๋า' });

  const farm = await prisma.farm.findUnique({ where: { userId: req.userId } });
  if (!farm) return res.status(404).json({ error: 'Farm not found' });

  await prisma.inventoryItem.update({
    where: { id: inv.id },
    data: { quantity: { decrement: 1 } },
  });

  const dec = await prisma.decoration.create({
    data: { farmId: farm.id, itemId, x, y },
  });
  res.json({ decoration: dec });
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const dec = await prisma.decoration.findFirst({
    where: { id: req.params.id, farm: { userId: req.userId } },
  });
  if (!dec) return res.status(404).json({ error: 'ไม่พบ' });

  await prisma.decoration.delete({ where: { id: dec.id } });
  await prisma.inventoryItem.upsert({
    where: { userId_itemId: { userId: req.userId!, itemId: dec.itemId } },
    create: { userId: req.userId!, itemId: dec.itemId, quantity: 1 },
    update: { quantity: { increment: 1 } },
  });
  res.json({ ok: true });
});

export default router;
