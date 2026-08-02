import { Router } from 'express';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

async function bumpQuest(userId: string, action: string, amount = 1) {
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
    console.warn('quest bump failed', e);
  }
}

// Crop growth times in milliseconds (for demo: short times)
const CROP_DATA: Record<string, { growthMs: number; stages: number; sellPrice: number }> = {
  tomato: { growthMs: 35_000, stages: 4, sellPrice: 25 },      // 1 นาที สำหรับทดสอบ
  carrot: { growthMs: 25_000, stages: 3, sellPrice: 18 },
  wheat: { growthMs: 50_000, stages: 4, sellPrice: 15 },
  potato: { growthMs: 40_000, stages: 3, sellPrice: 20 },
  corn: { growthMs: 70_000, stages: 5, sellPrice: 30 },
  strawberry: { growthMs: 55_000, stages: 4, sellPrice: 40 },
};

router.get('/', async (req: AuthRequest, res) => {
  const farm = await prisma.farm.findUnique({
    where: { userId: req.userId },
    include: {
      plots: true,
      animals: true,
      house: { include: { furniture: true } },
      decorations: true,
    },
  });
  if (!farm) return res.status(404).json({ error: 'Farm not found' });

  // อัปเดต growth stage ตามเวลาจริง
  const now = Date.now();
  for (const plot of farm.plots) {
    if (plot.state === 'planted' || plot.state === 'growing') {
      if (plot.plantedAt && plot.cropType && CROP_DATA[plot.cropType]) {
        const elapsed = now - new Date(plot.plantedAt).getTime();
        const data = CROP_DATA[plot.cropType];
        const stage = Math.min(
          data.stages,
          Math.floor((elapsed / data.growthMs) * data.stages)
        );
        if (stage !== plot.growthStage || (stage >= data.stages && plot.state !== 'ready')) {
          await prisma.farmPlot.update({
            where: { id: plot.id },
            data: {
              growthStage: stage,
              state: stage >= data.stages ? 'ready' : 'growing',
            },
          });
          plot.growthStage = stage;
          plot.state = stage >= data.stages ? 'ready' : 'growing';
        }
      }
    }
  }

  res.json({ farm });
});

// ไถดิน
router.post('/till', async (req: AuthRequest, res) => {
  const { x, y } = req.body;
  const farm = await prisma.farm.findUnique({ where: { userId: req.userId } });
  if (!farm) return res.status(404).json({ error: 'Farm not found' });

  const plot = await prisma.farmPlot.findUnique({
    where: { farmId_x_y: { farmId: farm.id, x, y } },
  });
  if (!plot) return res.status(404).json({ error: 'Plot not found' });
  if (plot.state !== 'empty' && plot.state !== 'dead') {
    return res.status(400).json({ error: 'Cannot till this plot' });
  }

  const updated = await prisma.farmPlot.update({
    where: { id: plot.id },
    data: { state: 'tilled', cropType: null, plantedAt: null, growthStage: 0 },
  });
  res.json({ plot: updated });
});

// ปลูก
router.post('/plant', async (req: AuthRequest, res) => {
  const schema = z.object({
    x: z.number().int(),
    y: z.number().int(),
    cropType: z.string(),
  });
  const { x, y, cropType } = schema.parse(req.body);

  if (!CROP_DATA[cropType]) {
    return res.status(400).json({ error: 'Unknown crop type' });
  }

  const farm = await prisma.farm.findUnique({ where: { userId: req.userId } });
  if (!farm) return res.status(404).json({ error: 'Farm not found' });

  // เช็คเมล็ดใน inventory
  const seedItem = await prisma.inventoryItem.findUnique({
    where: { userId_itemId: { userId: req.userId!, itemId: `seed_${cropType}` } },
  });
  if (!seedItem || seedItem.quantity < 1) {
    return res.status(400).json({ error: 'Not enough seeds' });
  }

  const plot = await prisma.farmPlot.findUnique({
    where: { farmId_x_y: { farmId: farm.id, x, y } },
  });
  if (!plot || plot.state !== 'tilled') {
    return res.status(400).json({ error: 'Plot must be tilled first' });
  }

  // ลดเมล็ด
  await prisma.inventoryItem.update({
    where: { id: seedItem.id },
    data: { quantity: { decrement: 1 } },
  });

  const updated = await prisma.farmPlot.update({
    where: { id: plot.id },
    data: {
      state: 'planted',
      cropType,
      plantedAt: new Date(),
      wateredAt: null,
      growthStage: 0,
      quality: 'common',
    },
  });

  await bumpQuest(req.userId!, 'plant');
  res.json({ plot: updated });
});

// รดน้ำ
router.post('/water', async (req: AuthRequest, res) => {
  const { x, y } = req.body;
  const farm = await prisma.farm.findUnique({ where: { userId: req.userId } });
  if (!farm) return res.status(404).json({ error: 'Farm not found' });

  const plot = await prisma.farmPlot.findUnique({
    where: { farmId_x_y: { farmId: farm.id, x, y } },
  });
  if (!plot || !['planted', 'growing'].includes(plot.state)) {
    return res.status(400).json({ error: 'Nothing to water' });
  }

  const updated = await prisma.farmPlot.update({
    where: { id: plot.id },
    data: { wateredAt: new Date() },
  });
  await bumpQuest(req.userId!, 'water');
  res.json({ plot: updated });
});

// เก็บเกี่ยว
router.post('/harvest', async (req: AuthRequest, res) => {
  const { x, y } = req.body;
  const farm = await prisma.farm.findUnique({ where: { userId: req.userId } });
  if (!farm) return res.status(404).json({ error: 'Farm not found' });

  const plot = await prisma.farmPlot.findUnique({
    where: { farmId_x_y: { farmId: farm.id, x, y } },
  });
  if (!plot || plot.state !== 'ready' || !plot.cropType) {
    return res.status(400).json({ error: 'Nothing ready to harvest' });
  }

  const cropData = CROP_DATA[plot.cropType];
  const qualityMult: Record<string, number> = { common: 1, rare: 1.5, epic: 2, legendary: 3 };
  const q = plot.quality || 'common';
  let quantity = 1 + Math.floor(Math.random() * 2);
  quantity = Math.max(1, Math.round(quantity * (qualityMult[q] || 1)));
  const itemId = `crop_${plot.cropType}`;

  // เพิ่มของใน inventory
  await prisma.inventoryItem.upsert({
    where: { userId_itemId: { userId: req.userId!, itemId } },
    create: { userId: req.userId!, itemId, quantity },
    update: { quantity: { increment: quantity } },
  });

  // เคลียร์แปลง
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

  // ให้ exp
  await prisma.character.update({
    where: { userId: req.userId },
    data: { experience: { increment: 10 } },
  });

  await bumpQuest(req.userId!, 'harvest');

  res.json({
    plot: updated,
    harvested: { itemId, quantity, sellPrice: cropData?.sellPrice || 10 },
  });
});

// บันทึกฟาร์ม (auto-save)
router.post('/save', async (req: AuthRequest, res) => {
  await prisma.farm.update({
    where: { userId: req.userId },
    data: { lastSavedAt: new Date() },
  });
  res.json({ ok: true, savedAt: new Date() });
});



// ขยายแปลงปลูก
router.post('/expand', async (req: AuthRequest, res) => {
  const farm = await prisma.farm.findUnique({
    where: { userId: req.userId },
    include: { plots: true },
  });
  if (!farm) return res.status(404).json({ error: 'Farm not found' });

  const maxX = Math.max(...farm.plots.map((p) => p.x), -1);
  const maxY = Math.max(...farm.plots.map((p) => p.y), -1);
  const currentCols = maxX + 1;
  const currentRows = maxY + 1;

  if (currentCols >= 10 && currentRows >= 6) {
    return res.status(400).json({ error: 'ฟาร์มขยายเต็มแล้ว' });
  }

  const cost = 200 + farm.level * 150;
  const coin = await prisma.inventoryItem.findUnique({
    where: { userId_itemId: { userId: req.userId!, itemId: 'coin' } },
  });
  if (!coin || coin.quantity < cost) {
    return res.status(400).json({ error: `ต้องการ ${cost} เหรียญ` });
  }

  await prisma.inventoryItem.update({
    where: { id: coin.id },
    data: { quantity: { decrement: cost } },
  });

  const newPlots: { farmId: string; x: number; y: number; state: string }[] = [];

  if (currentCols < 10) {
    for (let y = 0; y < currentRows; y++) {
      newPlots.push({ farmId: farm.id, x: currentCols, y, state: 'empty' });
    }
  } else {
    for (let x = 0; x < currentCols; x++) {
      newPlots.push({ farmId: farm.id, x, y: currentRows, state: 'empty' });
    }
  }

  await prisma.farmPlot.createMany({ data: newPlots });
  await prisma.farm.update({
    where: { id: farm.id },
    data: { level: { increment: 1 }, size: { increment: 1 } },
  });

  const updated = await prisma.farm.findUnique({
    where: { id: farm.id },
    include: { plots: true, animals: true, house: true },
  });

  res.json({ farm: updated, cost, added: newPlots.length });
});

// ใส่ปุ๋ย
router.post('/fertilize', async (req: AuthRequest, res) => {
  const { x, y } = req.body;
  const farm = await prisma.farm.findUnique({ where: { userId: req.userId } });
  if (!farm) return res.status(404).json({ error: 'Farm not found' });

  const plot = await prisma.farmPlot.findUnique({
    where: { farmId_x_y: { farmId: farm.id, x, y } },
  });
  if (!plot || !['planted', 'growing'].includes(plot.state)) {
    return res.status(400).json({ error: 'ใส่ปุ๋ยได้เฉพาะแปลงที่มีพืช' });
  }
  if (plot.fertilized) {
    return res.status(400).json({ error: 'ใส่ปุ๋ยไปแล้ว' });
  }

  const fert = await prisma.inventoryItem.findUnique({
    where: { userId_itemId: { userId: req.userId!, itemId: 'fertilizer' } },
  });
  if (!fert || fert.quantity < 1) {
    return res.status(400).json({ error: 'ไม่มีปุ๋ย (ซื้อได้ที่ร้านค้า)' });
  }

  await prisma.inventoryItem.update({
    where: { id: fert.id },
    data: { quantity: { decrement: 1 } },
  });

  const cropType = plot.cropType || 'tomato';
  const data = CROP_DATA[cropType];
  let newPlantedAt = plot.plantedAt;
  if (data && plot.plantedAt) {
    const boost = data.growthMs * 0.3;
    newPlantedAt = new Date(plot.plantedAt.getTime() - boost);
  }

  const roll = Math.random();
  let quality = plot.quality || 'common';
  if (roll < 0.05) quality = 'legendary';
  else if (roll < 0.15) quality = 'epic';
  else if (roll < 0.4) quality = 'rare';

  const updated = await prisma.farmPlot.update({
    where: { id: plot.id },
    data: {
      fertilized: true,
      plantedAt: newPlantedAt,
      quality,
    },
  });

  res.json({ plot: updated });
});

export default router;
