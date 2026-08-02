import { Router } from 'express';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';
import { applyLevelUp } from '../utils/progression.js';

const router = Router();

const CONSUMABLES: Record<string, { energy: number; name: string }> = {
  food_bread: { energy: 15, name: 'ขนมปัง' },
  food_salad: { energy: 25, name: 'สลัด' },
  drink_juice: { energy: 20, name: 'น้ำผลไม้' },
};

// กินอาหารฟื้นพลังงาน
router.post('/consume', async (req: AuthRequest, res) => {
  const schema = z.object({ itemId: z.string() });
  const { itemId } = schema.parse(req.body);
  const conf = CONSUMABLES[itemId];
  if (!conf) return res.status(400).json({ error: 'กินรายการนี้ไม่ได้' });

  const inv = await prisma.inventoryItem.findUnique({
    where: { userId_itemId: { userId: req.userId!, itemId } },
  });
  if (!inv || inv.quantity < 1) {
    return res.status(400).json({ error: 'ไม่มีของชิ้นนี้' });
  }

  await prisma.inventoryItem.update({
    where: { id: inv.id },
    data: { quantity: { decrement: 1 } },
  });

  const character = await prisma.character.findUnique({ where: { userId: req.userId } });
  if (!character) return res.status(404).json({ error: 'Not found' });

  const newEnergy = Math.min(character.maxEnergy, character.energy + conf.energy);
  await prisma.character.update({
    where: { userId: req.userId },
    data: { energy: newEnergy },
  });

  res.json({ ok: true, itemId, energyGained: conf.energy, energy: newEnergy });
});

export default router;
