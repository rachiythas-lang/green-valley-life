import { Router } from 'express';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';
import { bumpQuest } from './quest.js';

const router = Router();

const CROP_DATA: Record<string, { growthMs: number; stages: number; sellPrice: number }> = {
  tomato: { growthMs: 35_000, stages: 4, sellPrice: 25 },
  carrot: { growthMs: 25_000, stages: 3, sellPrice: 18 },
  wheat: { growthMs: 50_000, stages: 4, sellPrice: 15 },
  potato: { growthMs: 40_000, stages: 3, sellPrice: 20 },
  corn: { growthMs: 70_000, stages: 5, sellPrice: 30 },
  strawberry: { growthMs: 55_000, stages: 4, sellPrice: 40 },
};

router.get('/', async (req: AuthRequest, res) => {
  const farm = await prisma.farm.findUnique({
    where: { userId: req.userId },
    include: { plots: true, animals: true, decorations: true },
  });
  if (!farm) return res.status(404).json({ error: 'Farm not found' });

  const now = Date.now();
  for (const plot of farm.plots) {
    if ((plot.state === 'planted' || plot.state === 'growing') && plot.plantedAt && plot.cropType) {
      const data = CROP_DATA[plot.cropType];
      if (!data) continue;
      const elapsed = now - new Date(plot.plantedAt).getTime();
      const stage = Math.min(data.stages, Math.floor((elapsed / data.growthMs) * data.stages));
      const state = stage >= data.stages ? 'ready' : 'growing';
      if (stage !== plot.growthStage || plot.state !== state) {
        await prisma.farmPlot.update({
          where: { id: plot.id },
          data: { growthStage: stage, state },
        });
        plot.growthStage = stage;
        plot.state = state;
      }
    }
  }
  res.json({ farm });
});

router.post('/till', async (req: AuthRequest, res) => {
  const { x, y } = req.body;
  const farm = await prisma.farm.findUnique({ where: { userId: req.userId } });
  if (!farm) return res.status(404).json({ error: 'Farm not found' });
  const plot = await prisma.farmPlot.findUnique({ where: { farmId_x_y: { farmId: farm.id, x, y } } });
  if (!plot || (plot.state !== 'empty' && plot.state !== 'dead')) {
    return res.status(400).json({ error: 'ไถไม่ได้' });
  }
  const updated = await prisma.farmPlot.update({
    where: { id: plot.id },
    data: { state: 'tilled', cropType: null, plantedAt: null, growthStage: 0 },
  });
  res.json({ plot: updated });
});

router.post('/plant', async (req: AuthRequest, res) => {
  const { x, y, cropType } = z.object({ x: z.number(), y: z.number(), cropType: z.string() }).parse(req.body);
  if (!CROP_DATA[cropType]) return res.status(400).json({ error: 'พืชไม่รู้จัก' });
  const farm = await prisma.farm.findUnique({ where: { userId: req.userId } });
  if (!farm) return res.status(404).json({ error: 'Farm not found' });

  const seed = await prisma.inventoryItem.findUnique({
    where: { userId_itemId: { userId: req.userId!, itemId: `seed_${cropType}` } },
  });
  if (!seed || seed.quantity < 1) return res.status(400).json({ error: 'เมล็ดไม่พอ' });

  const plot = await prisma.farmPlot.findUnique({ where: { farmId_x_y: { farmId: farm.id, x, y } } });
  if (!plot || plot.state !== 'tilled') return res.status(400).json({ error: 'ต้องไถก่อน' });

  await prisma.inventoryItem.update({ where: { id: seed.id }, data: { quantity: { decrement: 1 } } });
  const updated = await prisma.farmPlot.update({
    where: { id: plot.id },
    data: { state: 'planted', cropType, plantedAt: new Date(), growthStage: 0, quality: 'common' },
  });

  await bumpQuest(req.userId!, `plant_${cropType}`);
  await bumpQuest(req.userId!, 'plant');

  res.json({ plot: updated });
});

router.post('/water', async (req: AuthRequest, res) => {
  const { x, y } = req.body;
  const farm = await prisma.farm.findUnique({ where: { userId: req.userId } });
  if (!farm) return res.status(404).json({ error: 'Farm not found' });
  const plot = await prisma.farmPlot.findUnique({ where: { farmId_x_y: { farmId: farm.id, x, y } } });
  if (!plot || !['planted', 'growing'].includes(plot.state)) {
    return res.status(400).json({ error: 'รดน้ำไม่ได้' });
  }
  const updated = await prisma.farmPlot.update({
    where: { id: plot.id },
    data: { wateredAt: new Date() },
  });
  res.json({ plot: updated });
});

router.post('/harvest', async (req: AuthRequest, res) => {
  const { x, y } = req.body;
  const farm = await prisma.farm.findUnique({ where: { userId: req.userId } });
  if (!farm) return res.status(404).json({ error: 'Farm not found' });
  const plot = await prisma.farmPlot.findUnique({ where: { farmId_x_y: { farmId: farm.id, x, y } } });
  if (!plot || plot.state !== 'ready' || !plot.cropType) {
    return res.status(400).json({ error: 'ยังไม่พร้อมเก็บ' });
  }
  const cropData = CROP_DATA[plot.cropType];
  const qty = 1 + Math.floor(Math.random() * 2);
  const itemId = `crop_${plot.cropType}`;

  await prisma.inventoryItem.upsert({
    where: { userId_itemId: { userId: req.userId!, itemId } },
    create: { userId: req.userId!, itemId, quantity: qty },
    update: { quantity: { increment: qty } },
  });

  const updated = await prisma.farmPlot.update({
    where: { id: plot.id },
    data: {
      state: 'empty',
      cropType: null,
      plantedAt: null,
      wateredAt: null,
      growthStage: 0,
      fertilized: false,
    },
  });

  await prisma.character.update({
    where: { userId: req.userId },
    data: { experience: { increment: 10 } },
  });

  await bumpQuest(req.userId!, 'harvest');

  res.json({ plot: updated, harvested: { itemId, quantity: qty, sellPrice: cropData?.sellPrice || 10 } });
});

router.post('/save', async (req: AuthRequest, res) => {
  await prisma.farm.update({ where: { userId: req.userId }, data: { lastSavedAt: new Date() } });
  res.json({ ok: true, savedAt: new Date() });
});

export default router;
