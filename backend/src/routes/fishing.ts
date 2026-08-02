import { Router } from 'express';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

const FISH_TABLE = [
  { id: 'fish_carp', nameTh: 'ปลาตะเพียน', nameEn: 'Carp', weight: 35, sellPrice: 20, rarity: 'common' },
  { id: 'fish_catfish', nameTh: 'ปลาดุก', nameEn: 'Catfish', weight: 25, sellPrice: 35, rarity: 'common' },
  { id: 'fish_bass', nameTh: 'ปลากะพง', nameEn: 'Bass', weight: 18, sellPrice: 50, rarity: 'rare' },
  { id: 'fish_salmon', nameTh: 'ปลาแซลมอน', nameEn: 'Salmon', weight: 12, sellPrice: 80, rarity: 'rare' },
  { id: 'fish_tuna', nameTh: 'ปลาทูน่า', nameEn: 'Tuna', weight: 6, sellPrice: 150, rarity: 'epic' },
  { id: 'fish_golden', nameTh: 'ปลาทองตำนาน', nameEn: 'Golden Fish', weight: 2, sellPrice: 500, rarity: 'legendary' },
  { id: 'trash_boot', nameTh: 'รองเท้าเก่า', nameEn: 'Old Boot', weight: 8, sellPrice: 1, rarity: 'trash' },
  { id: 'trash_weed', nameTh: 'สาหร่าย', nameEn: 'Seaweed', weight: 10, sellPrice: 2, rarity: 'trash' },
];

function rollFish() {
  const total = FISH_TABLE.reduce((s, f) => s + f.weight, 0);
  let r = Math.random() * total;
  for (const f of FISH_TABLE) {
    r -= f.weight;
    if (r <= 0) return f;
  }
  return FISH_TABLE[0];
}

// ข้อมูลบ่อตกปลา
router.get('/spots', (_req, res) => {
  res.json({
    spots: [
      { id: 'pond', nameTh: 'บ่อน้ำในฟาร์ม', nameEn: 'Farm Pond', energyCost: 5, unlockLevel: 1 },
      { id: 'river', nameTh: 'แม่น้ำ', nameEn: 'River', energyCost: 8, unlockLevel: 3 },
      { id: 'lake', nameTh: 'ทะเลสาบ', nameEn: 'Lake', energyCost: 10, unlockLevel: 5 },
    ],
    fishCatalog: FISH_TABLE.map(({ weight, ...rest }) => rest),
  });
});

// เริ่มตกปลา (สุ่มผล)
router.post('/cast', async (req: AuthRequest, res) => {
  const schema = z.object({
    spotId: z.enum(['pond', 'river', 'lake']).default('pond'),
  });
  const { spotId } = schema.parse(req.body);

  const energyCost = spotId === 'pond' ? 5 : spotId === 'river' ? 8 : 10;

  const character = await prisma.character.findUnique({ where: { userId: req.userId } });
  if (!character) return res.status(404).json({ error: 'Character not found' });
  if (character.energy < energyCost) {
    return res.status(400).json({ error: `ต้องการพลังงาน ${energyCost}` });
  }

  // ลด energy
  await prisma.character.update({
    where: { userId: req.userId },
    data: { energy: { decrement: energyCost } },
  });

  const fish = rollFish();
  const isTrash = fish.rarity === 'trash';

  if (!isTrash) {
    await prisma.inventoryItem.upsert({
      where: { userId_itemId: { userId: req.userId!, itemId: fish.id } },
      create: { userId: req.userId!, itemId: fish.id, quantity: 1 },
      update: { quantity: { increment: 1 } },
    });
  }

  // exp
  const expGain = isTrash ? 2 : fish.rarity === 'legendary' ? 40 : fish.rarity === 'epic' ? 20 : fish.rarity === 'rare' ? 12 : 6;
  await prisma.character.update({
    where: { userId: req.userId },
    data: { experience: { increment: expGain } },
  });

  res.json({
    result: fish,
    energySpent: energyCost,
    expGained: expGain,
    caught: !isTrash,
  });
});

export default router;
