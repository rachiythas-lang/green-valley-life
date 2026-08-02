import { Router } from 'express';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';
import { bumpQuest } from './quest.js';

const router = Router();

const TYPES: Record<string, { product: string; price: number; label: string }> = {
  chicken: { product: 'egg', price: 150, label: 'ไก่' },
  cow: { product: 'milk', price: 500, label: 'วัว' },
  duck: { product: 'egg', price: 180, label: 'เป็ด' },
};

router.get('/', async (req: AuthRequest, res) => {
  const farm = await prisma.farm.findUnique({
    where: { userId: req.userId },
    include: { animals: true },
  });
  if (!farm) return res.status(404).json({ error: 'Farm not found' });

  // ถ้ายังไม่มีไก่ ให้ตัวเริ่ม 1 ตัว
  if (farm.animals.length === 0) {
    const a = await prisma.animal.create({
      data: {
        farmId: farm.id,
        type: 'chicken',
        name: 'เจี๊ยบ',
        posX: 220,
        posY: 540,
        productReady: true,
      },
    });
    farm.animals.push(a);
  }

  res.json({ animals: farm.animals, catalog: TYPES });
});

router.post('/buy', async (req: AuthRequest, res) => {
  const type = req.body.type || 'chicken';
  const conf = TYPES[type];
  if (!conf) return res.status(400).json({ error: 'สัตว์ไม่รู้จัก' });

  const farm = await prisma.farm.findUnique({ where: { userId: req.userId } });
  if (!farm) return res.status(404).json({ error: 'Farm not found' });

  const count = await prisma.animal.count({ where: { farmId: farm.id } });
  if (count >= 8) return res.status(400).json({ error: 'คอกเต็มแล้ว (สูงสุด 8)' });

  const coin = await prisma.inventoryItem.findUnique({
    where: { userId_itemId: { userId: req.userId!, itemId: 'coin' } },
  });
  if (!coin || coin.quantity < conf.price) {
    return res.status(400).json({ error: `ต้องการ ${conf.price} เหรียญ` });
  }

  await prisma.inventoryItem.update({
    where: { id: coin.id },
    data: { quantity: { decrement: conf.price } },
  });

  const animal = await prisma.animal.create({
    data: {
      farmId: farm.id,
      type,
      name: conf.label,
      posX: 180 + Math.random() * 200,
      posY: 500 + Math.random() * 80,
      productReady: false,
      lastCollectedAt: new Date(),
    },
  });

  res.json({ animal, cost: conf.price });
});

router.post('/collect/:id', async (req: AuthRequest, res) => {
  const animal = await prisma.animal.findFirst({
    where: { id: req.params.id, farm: { userId: req.userId } },
  });
  if (!animal) return res.status(404).json({ error: 'ไม่พบสัตว์' });
  if (!animal.productReady) return res.status(400).json({ error: 'ยังไม่พร้อมเก็บ' });

  const conf = TYPES[animal.type] || TYPES.chicken;
  await prisma.inventoryItem.upsert({
    where: { userId_itemId: { userId: req.userId!, itemId: conf.product } },
    create: { userId: req.userId!, itemId: conf.product, quantity: 1 },
    update: { quantity: { increment: 1 } },
  });

  await prisma.animal.update({
    where: { id: animal.id },
    data: { productReady: false, lastCollectedAt: new Date() },
  });

  if (conf.product === 'egg') await bumpQuest(req.userId!, 'collect_egg');

  res.json({ ok: true, product: conf.product, quantity: 1 });
});

// รีเซ็ต product พร้อมทุก 60 วิ (เรียกตอน get ก็ได้)
router.post('/tick', async (req: AuthRequest, res) => {
  const farm = await prisma.farm.findUnique({
    where: { userId: req.userId },
    include: { animals: true },
  });
  if (!farm) return res.status(404).json({ error: 'Farm not found' });

  const now = Date.now();
  for (const a of farm.animals) {
    if (a.productReady) continue;
    const last = a.lastCollectedAt ? new Date(a.lastCollectedAt).getTime() : 0;
    if (now - last > 60_000) {
      await prisma.animal.update({ where: { id: a.id }, data: { productReady: true } });
      a.productReady = true;
    }
  }
  res.json({ animals: farm.animals });
});

export default router;
