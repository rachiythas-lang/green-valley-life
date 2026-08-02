import { Router } from 'express';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

const updateSchema = z.object({
  name: z.string().min(2).max(16).optional(),
  gender: z.enum(['male', 'female']).optional(),
  hairStyle: z.number().int().min(0).max(20).optional(),
  hairColor: z.string().optional(),
  eyeStyle: z.number().int().min(0).max(10).optional(),
  eyeColor: z.string().optional(),
  skinTone: z.string().optional(),
  outfitTop: z.number().int().min(0).max(30).optional(),
  outfitBottom: z.number().int().min(0).max(30).optional(),
  shoes: z.number().int().min(0).max(20).optional(),
  hat: z.number().int().min(-1).max(20).optional(),
  accessory: z.number().int().min(-1).max(20).optional(),
});

router.get('/', async (req: AuthRequest, res) => {
  const character = await prisma.character.findUnique({
    where: { userId: req.userId },
  });
  if (!character) return res.status(404).json({ error: 'Character not found' });
  res.json({ character });
});

router.put('/', async (req: AuthRequest, res) => {
  try {
    const data = updateSchema.parse(req.body);
    const character = await prisma.character.update({
      where: { userId: req.userId },
      data,
    });
    res.json({ character });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/position', async (req: AuthRequest, res) => {
  const { x, y, map } = req.body;
  const character = await prisma.character.update({
    where: { userId: req.userId },
    data: {
      posX: x ?? 0,
      posY: y ?? 0,
      currentMap: map ?? 'farm',
    },
  });
  res.json({ character });
});

export default router;
