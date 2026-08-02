import { Router } from 'express';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

const ORES = [
  { id: 'ore_coal', nameTh: 'ถ่านหิน', weight: 30, sellPrice: 8, rarity: 'common' },
  { id: 'ore_iron', nameTh: 'แร่เหล็ก', weight: 25, sellPrice: 18, rarity: 'common' },
  { id: 'ore_silver', nameTh: 'แร่เงิน', weight: 15, sellPrice: 40, rarity: 'rare' },
  { id: 'ore_gold', nameTh: 'แร่ทอง', weight: 10, sellPrice: 80, rarity: 'rare' },
  { id: 'ore_crystal', nameTh: 'คริสตัล', weight: 8, sellPrice: 120, rarity: 'epic' },
  { id: 'ore_ruby', nameTh: 'ทับทิม', weight: 5, sellPrice: 200, rarity: 'epic' },
  { id: 'ore_diamond', nameTh: 'เพชร', weight: 3, sellPrice: 400, rarity: 'legendary' },
  { id: 'ore_stone', nameTh: 'หินธรรมดา', weight: 20, sellPrice: 3, rarity: 'common' },
];

const ZONES = [
  { id: 'cave', nameTh: 'ถ้ำตื้น', energyCost: 8, unlockLevel: 1, multi: 1 },
  { id: 'deep', nameTh: 'เหมืองลึก', energyCost: 14, unlockLevel: 4, multi: 1.4 },
  { id: 'crystal_cave', nameTh: 'ถ้ำคริสตัล', energyCost: 20, unlockLevel: 8, multi: 1.8 },
];

function rollOre(multi = 1) {
  // multi เพิ่มโอกาสของหายากเล็กน้อยโดยลด weight ขยะ
  const table = ORES.map((o) => ({
    ...o,
    weight: o.rarity === 'common' ? o.weight / multi : o.weight * multi,
  }));
  const total = table.reduce((s, o) => s + o.weight, 0);
  let r = Math.random() * total;
  for (const o of table) {
    r -= o.weight;
    if (r <= 0) return o;
  }
  return ORES[0];
}

router.get('/zones', (_req, res) => {
  res.json({
    zones: ZONES,
    ores: ORES.map(({ weight, ...r }) => r),
  });
});

router.post('/mine', async (req: AuthRequest, res) => {
  const schema = z.object({
    zoneId: z.enum(['cave', 'deep', 'crystal_cave']).default('cave'),
  });
  const { zoneId } = schema.parse(req.body);
  const zone = ZONES.find((z) => z.id === zoneId) || ZONES[0];

  const character = await prisma.character.findUnique({ where: { userId: req.userId } });
  if (!character) return res.status(404).json({ error: 'Character not found' });
  if (character.level < zone.unlockLevel) {
    return res.status(400).json({ error: `ต้องการเลเวล ${zone.unlockLevel}` });
  }
  if (character.energy < zone.energyCost) {
    return res.status(400).json({ error: `ต้องการพลังงาน ${zone.energyCost}` });
  }

  await prisma.character.update({
    where: { userId: req.userId },
    data: { energy: { decrement: zone.energyCost } },
  });

  // ได้ 1-3 ชิ้น
  const drops = [];
  const count = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const ore = rollOre(zone.multi);
    drops.push(ore);
    await prisma.inventoryItem.upsert({
      where: { userId_itemId: { userId: req.userId!, itemId: ore.id } },
      create: { userId: req.userId!, itemId: ore.id, quantity: 1 },
      update: { quantity: { increment: 1 } },
    });
  }

  const expGain = 8 + drops.reduce((s, d) => {
    if (d.rarity === 'legendary') return s + 25;
    if (d.rarity === 'epic') return s + 15;
    if (d.rarity === 'rare') return s + 8;
    return s + 3;
  }, 0);

  await prisma.character.update({
    where: { userId: req.userId },
    data: { experience: { increment: expGain } },
  });

  res.json({
    drops,
    energySpent: zone.energyCost,
    expGained: expGain,
    zone: zone.nameTh,
  });
});

// พักฟื้นพลังงาน (ง่าย ๆ)
router.post('/rest', async (req: AuthRequest, res) => {
  const character = await prisma.character.findUnique({ where: { userId: req.userId } });
  if (!character) return res.status(404).json({ error: 'Not found' });

  const gain = 25;
  const updated = await prisma.character.update({
    where: { userId: req.userId },
    data: { energy: Math.min(character.maxEnergy, character.energy + gain) },
  });

  res.json({ energy: updated.energy, maxEnergy: updated.maxEnergy, gained: gain });
});

export default router;
