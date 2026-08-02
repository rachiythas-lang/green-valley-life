import { Router } from 'express';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

const FISH = [
  { id: 'fish_carp', nameTh: 'ปลาตะเพียน', weight: 40, sell: 30 },
  { id: 'fish_catfish', nameTh: 'ปลาดุก', weight: 25, sell: 45 },
  { id: 'fish_bass', nameTh: 'ปลากะพง', weight: 15, sell: 70 },
  { id: 'fish_golden', nameTh: 'ปลาทอง', weight: 5, sell: 200 },
  { id: 'trash_boot', nameTh: 'รองเท้าเก่า', weight: 15, sell: 1 },
];

function roll() {
  const total = FISH.reduce((s, f) => s + f.weight, 0);
  let r = Math.random() * total;
  for (const f of FISH) {
    r -= f.weight;
    if (r <= 0) return f;
  }
  return FISH[0];
}

router.post('/cast', async (req: AuthRequest, res) => {
  const character = await prisma.character.findUnique({ where: { userId: req.userId } });
  if (!character) return res.status(404).json({ error: 'Not found' });
  if (character.energy < 5) return res.status(400).json({ error: 'พลังงานไม่พอ (ต้องการ 5)' });

  await prisma.character.update({
    where: { userId: req.userId },
    data: { energy: { decrement: 5 }, experience: { increment: 5 } },
  });

  const fish = roll();
  const isTrash = fish.id.startsWith('trash_');
  if (!isTrash) {
    await prisma.inventoryItem.upsert({
      where: { userId_itemId: { userId: req.userId!, itemId: fish.id } },
      create: { userId: req.userId!, itemId: fish.id, quantity: 1 },
      update: { quantity: { increment: 1 } },
    });
  }

  res.json({
    result: fish,
    caught: !isTrash,
    energySpent: 5,
  });
});

export default router;
