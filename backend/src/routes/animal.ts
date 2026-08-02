import { Router } from 'express';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

const ANIMAL_TYPES: Record<string, { product: string; feedCost: number; collectCooldownMs: number; buyPrice: number }> = {
  chicken: { product: 'egg', feedCost: 5, collectCooldownMs: 30_000, buyPrice: 200 },
  cow: { product: 'milk', feedCost: 15, collectCooldownMs: 60_000, buyPrice: 800 },
  pig: { product: 'truffle', feedCost: 12, collectCooldownMs: 90_000, buyPrice: 600 },
  sheep: { product: 'wool', feedCost: 10, collectCooldownMs: 120_000, buyPrice: 500 },
  duck: { product: 'duck_egg', feedCost: 6, collectCooldownMs: 40_000, buyPrice: 250 },
  rabbit: { product: 'rabbit_wool', feedCost: 4, collectCooldownMs: 50_000, buyPrice: 180 },
};

// รายการสัตว์ในฟาร์ม
router.get('/', async (req: AuthRequest, res) => {
  const farm = await prisma.farm.findUnique({
    where: { userId: req.userId },
    include: { animals: true },
  });
  if (!farm) return res.status(404).json({ error: 'Farm not found' });

  // อัปเดต productReady ตามเวลา
  const now = Date.now();
  for (const animal of farm.animals) {
    const conf = ANIMAL_TYPES[animal.type];
    if (!conf) continue;
    if (animal.lastCollectedAt) {
      const elapsed = now - new Date(animal.lastCollectedAt).getTime();
      if (elapsed >= conf.collectCooldownMs && !animal.productReady) {
        await prisma.animal.update({
          where: { id: animal.id },
          data: { productReady: true },
        });
        animal.productReady = true;
      }
    } else if (!animal.productReady) {
      // สัตว์ใหม่ให้พร้อมเก็บหลัง cooldown
      await prisma.animal.update({
        where: { id: animal.id },
        data: { productReady: true },
      });
      animal.productReady = true;
    }
  }

  res.json({ animals: farm.animals, catalog: ANIMAL_TYPES });
});

// ซื้อสัตว์
router.post('/buy', async (req: AuthRequest, res) => {
  const schema = z.object({
    type: z.string(),
    name: z.string().max(16).optional(),
  });
  const { type, name } = schema.parse(req.body);
  const conf = ANIMAL_TYPES[type];
  if (!conf) return res.status(400).json({ error: 'Unknown animal type' });

  const farm = await prisma.farm.findUnique({ where: { userId: req.userId } });
  if (!farm) return res.status(404).json({ error: 'Farm not found' });

  // จำกัดจำนวนสัตว์
  const count = await prisma.animal.count({ where: { farmId: farm.id } });
  if (count >= 12) return res.status(400).json({ error: 'Farm animal limit reached (12)' });

  // เช็คเงิน
  const coin = await prisma.inventoryItem.findUnique({
    where: { userId_itemId: { userId: req.userId!, itemId: 'coin' } },
  });
  if (!coin || coin.quantity < conf.buyPrice) {
    return res.status(400).json({ error: 'Not enough coins' });
  }

  await prisma.inventoryItem.update({
    where: { id: coin.id },
    data: { quantity: { decrement: conf.buyPrice } },
  });

  const animal = await prisma.animal.create({
    data: {
      farmId: farm.id,
      type,
      name: name || `${type}-${count + 1}`,
      posX: 200 + Math.random() * 300,
      posY: 500 + Math.random() * 150,
      productReady: false,
      lastCollectedAt: new Date(),
    },
  });

  res.json({ animal, cost: conf.buyPrice });
});

// ให้อาหาร
router.post('/feed/:id', async (req: AuthRequest, res) => {
  const animal = await prisma.animal.findFirst({
    where: { id: req.params.id, farm: { userId: req.userId } },
  });
  if (!animal) return res.status(404).json({ error: 'Animal not found' });

  const conf = ANIMAL_TYPES[animal.type];
  if (!conf) return res.status(400).json({ error: 'Invalid animal' });

  const coin = await prisma.inventoryItem.findUnique({
    where: { userId_itemId: { userId: req.userId!, itemId: 'coin' } },
  });
  if (!coin || coin.quantity < conf.feedCost) {
    return res.status(400).json({ error: 'Not enough coins for feed' });
  }

  await prisma.inventoryItem.update({
    where: { id: coin.id },
    data: { quantity: { decrement: conf.feedCost } },
  });

  const updated = await prisma.animal.update({
    where: { id: animal.id },
    data: {
      hunger: Math.max(0, animal.hunger - 40),
      happiness: Math.min(100, animal.happiness + 15),
      lastFedAt: new Date(),
    },
  });

  res.json({ animal: updated });
});

// เก็บผลผลิต
router.post('/collect/:id', async (req: AuthRequest, res) => {
  const animal = await prisma.animal.findFirst({
    where: { id: req.params.id, farm: { userId: req.userId } },
  });
  if (!animal) return res.status(404).json({ error: 'Animal not found' });
  if (!animal.productReady) return res.status(400).json({ error: 'Product not ready' });

  const conf = ANIMAL_TYPES[animal.type];
  if (!conf) return res.status(400).json({ error: 'Invalid animal' });

  const qty = 1 + Math.floor(Math.random() * 2);

  await prisma.inventoryItem.upsert({
    where: { userId_itemId: { userId: req.userId!, itemId: conf.product } },
    create: { userId: req.userId!, itemId: conf.product, quantity: qty },
    update: { quantity: { increment: qty } },
  });

  const updated = await prisma.animal.update({
    where: { id: animal.id },
    data: {
      productReady: false,
      lastCollectedAt: new Date(),
      happiness: Math.min(100, animal.happiness + 5),
    },
  });

  // exp
  await prisma.character.update({
    where: { userId: req.userId },
    data: { experience: { increment: 8 } },
  });

  res.json({ animal: updated, collected: { itemId: conf.product, quantity: qty } });
});

export default router;
