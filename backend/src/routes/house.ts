import { Router } from 'express';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

const FURNITURE_CATALOG = [
  { id: 'chair_wood', nameTh: 'เก้าอี้ไม้', nameEn: 'Wood Chair', price: 80, category: 'chair' },
  { id: 'table_wood', nameTh: 'โต๊ะไม้', nameEn: 'Wood Table', price: 150, category: 'table' },
  { id: 'sofa_green', nameTh: 'โซฟาเขียว', nameEn: 'Green Sofa', price: 320, category: 'sofa' },
  { id: 'bed_simple', nameTh: 'เตียงธรรมดา', nameEn: 'Simple Bed', price: 250, category: 'bed' },
  { id: 'lamp_floor', nameTh: 'โคมไฟตั้งพื้น', nameEn: 'Floor Lamp', price: 90, category: 'lamp' },
  { id: 'plant_pot', nameTh: 'ต้นไม้กระถาง', nameEn: 'Potted Plant', price: 60, category: 'plant' },
  { id: 'shelf_wood', nameTh: 'ชั้นวางของ', nameEn: 'Wood Shelf', price: 120, category: 'shelf' },
  { id: 'rug_pastel', nameTh: 'พรมพาสเทล', nameEn: 'Pastel Rug', price: 100, category: 'rug' },
  { id: 'tv_old', nameTh: 'ทีวีเก่า', nameEn: 'Old TV', price: 400, category: 'electronics' },
  { id: 'clock_wall', nameTh: 'นาฬิกาแขวน', nameEn: 'Wall Clock', price: 70, category: 'decor' },
];

router.get('/', async (req: AuthRequest, res) => {
  const farm = await prisma.farm.findUnique({
    where: { userId: req.userId },
    include: { house: { include: { furniture: true } } },
  });
  if (!farm?.house) return res.status(404).json({ error: 'House not found' });
  res.json({ house: farm.house, catalog: FURNITURE_CATALOG });
});

// ซื้อและวางเฟอร์นิเจอร์
router.post('/place', async (req: AuthRequest, res) => {
  const schema = z.object({
    furnitureId: z.string(),
    x: z.number(),
    y: z.number(),
    rotation: z.number().int().default(0),
  });
  const { furnitureId, x, y, rotation } = schema.parse(req.body);
  const item = FURNITURE_CATALOG.find((f) => f.id === furnitureId);
  if (!item) return res.status(400).json({ error: 'Unknown furniture' });

  const farm = await prisma.farm.findUnique({
    where: { userId: req.userId },
    include: { house: true },
  });
  if (!farm?.house) return res.status(404).json({ error: 'House not found' });

  const coin = await prisma.inventoryItem.findUnique({
    where: { userId_itemId: { userId: req.userId!, itemId: 'coin' } },
  });
  if (!coin || coin.quantity < item.price) {
    return res.status(400).json({ error: 'Not enough coins' });
  }

  await prisma.inventoryItem.update({
    where: { id: coin.id },
    data: { quantity: { decrement: item.price } },
  });

  const placement = await prisma.furniturePlacement.create({
    data: {
      houseId: farm.house.id,
      furnitureId,
      x,
      y,
      rotation,
    },
  });

  res.json({ placement, cost: item.price });
});

// ย้ายเฟอร์นิเจอร์
router.put('/move/:id', async (req: AuthRequest, res) => {
  const { x, y, rotation } = req.body;
  const placement = await prisma.furniturePlacement.findFirst({
    where: {
      id: req.params.id,
      house: { farm: { userId: req.userId } },
    },
  });
  if (!placement) return res.status(404).json({ error: 'Furniture not found' });

  const updated = await prisma.furniturePlacement.update({
    where: { id: placement.id },
    data: {
      x: x ?? placement.x,
      y: y ?? placement.y,
      rotation: rotation ?? placement.rotation,
    },
  });
  res.json({ placement: updated });
});

// ลบเฟอร์นิเจอร์ (ขายคืน 50%)
router.delete('/:id', async (req: AuthRequest, res) => {
  const placement = await prisma.furniturePlacement.findFirst({
    where: {
      id: req.params.id,
      house: { farm: { userId: req.userId } },
    },
  });
  if (!placement) return res.status(404).json({ error: 'Furniture not found' });

  const item = FURNITURE_CATALOG.find((f) => f.id === placement.furnitureId);
  const refund = item ? Math.floor(item.price * 0.5) : 0;

  await prisma.furniturePlacement.delete({ where: { id: placement.id } });

  if (refund > 0) {
    await prisma.inventoryItem.upsert({
      where: { userId_itemId: { userId: req.userId!, itemId: 'coin' } },
      create: { userId: req.userId!, itemId: 'coin', quantity: refund },
      update: { quantity: { increment: refund } },
    });
  }

  res.json({ ok: true, refund });
});

// อัปเกรดบ้าน
router.post('/upgrade', async (req: AuthRequest, res) => {
  const farm = await prisma.farm.findUnique({
    where: { userId: req.userId },
    include: { house: true },
  });
  if (!farm?.house) return res.status(404).json({ error: 'House not found' });

  const cost = farm.house.level * 500;
  const coin = await prisma.inventoryItem.findUnique({
    where: { userId_itemId: { userId: req.userId!, itemId: 'coin' } },
  });
  if (!coin || coin.quantity < cost) {
    return res.status(400).json({ error: `Need ${cost} coins` });
  }

  await prisma.inventoryItem.update({
    where: { id: coin.id },
    data: { quantity: { decrement: cost } },
  });

  const house = await prisma.house.update({
    where: { id: farm.house.id },
    data: { level: { increment: 1 } },
  });

  res.json({ house, cost });
});

export default router;
