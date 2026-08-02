import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';
import { z } from 'zod';
import { applyLevelUp } from '../utils/progression.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email().optional(),
  displayName: z.string().min(2).max(24),
  provider: z.enum(['email', 'google', 'guest', 'apple']).default('email'),
  firebaseUid: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email().optional(),
  firebaseUid: z.string().optional(),
  provider: z.enum(['email', 'google', 'guest', 'apple']).default('email'),
  displayName: z.string().optional(),
});

function createToken(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '30d' });
}

// Guest login / register
router.post('/guest', async (req, res) => {
  try {
    const name = req.body.displayName || `นักเดินทาง${Math.floor(Math.random() * 9000 + 1000)}`;
    
    const user = await prisma.user.create({
      data: {
        displayName: name,
        provider: 'guest',
        character: {
          create: {
            name: name,
            gender: 'male',
          },
        },
        farm: {
          create: {
            name: `${name}'s Farm`,
            plots: {
              create: generateStarterPlots(),
            },
            house: {
              create: {},
            },
          },
        },
      },
      include: {
        character: true,
        farm: { include: { plots: true, house: true } },
      },
    });

    // ให้เหรียญเริ่มต้น
    await prisma.inventoryItem.create({
      data: { userId: user.id, itemId: 'coin', quantity: 500 },
    });
    await prisma.inventoryItem.create({
      data: { userId: user.id, itemId: 'seed_tomato', quantity: 10 },
    });
    await prisma.inventoryItem.create({
      data: { userId: user.id, itemId: 'seed_carrot', quantity: 10 },
    });
    await prisma.inventoryItem.create({
      data: { userId: user.id, itemId: 'watering_can', quantity: 1 },
    });
    await prisma.inventoryItem.create({
      data: { userId: user.id, itemId: 'hoe', quantity: 1 },
    });

    const token = createToken(user.id);
    res.json({ token, user });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Register / Login รวม (สำหรับ Firebase หรือ email ง่าย ๆ)
router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);

    let user = null;

    if (data.firebaseUid) {
      user = await prisma.user.findUnique({
        where: { firebaseUid: data.firebaseUid },
        include: { character: true, farm: { include: { plots: true } } },
      });
    } else if (data.email) {
      user = await prisma.user.findUnique({
        where: { email: data.email },
        include: { character: true, farm: { include: { plots: true } } },
      });
    }

    if (!user) {
      // สร้างใหม่
      const name = data.displayName || data.email?.split('@')[0] || 'Player';
      user = await prisma.user.create({
        data: {
          email: data.email,
          displayName: name,
          provider: data.provider,
          firebaseUid: data.firebaseUid,
          character: {
            create: {
              name,
              gender: 'male',
            },
          },
          farm: {
            create: {
              name: `${name}'s Farm`,
              plots: { create: generateStarterPlots() },
              house: { create: {} },
            },
          },
        },
        include: {
          character: true,
          farm: { include: { plots: true, house: true } },
        },
      });

      await prisma.inventoryItem.createMany({
        data: [
          { userId: user.id, itemId: 'coin', quantity: 500 },
          { userId: user.id, itemId: 'seed_tomato', quantity: 10 },
          { userId: user.id, itemId: 'seed_carrot', quantity: 10 },
          { userId: user.id, itemId: 'watering_can', quantity: 1 },
          { userId: user.id, itemId: 'hoe', quantity: 1 },
        ],
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = createToken(user.id);
    res.json({ token, user });
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// Me
router.get('/me', async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        character: true,
        farm: { include: { plots: true, animals: true, house: true } },
        inventory: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    // ตรวจเลเวลอัพทุกครั้งที่ดึงข้อมูล
    if (user.character) {
      await applyLevelUp(user.id);
      const refreshed = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: {
          character: true,
          farm: { include: { plots: true, animals: true, house: true } },
          inventory: true,
        },
      });
      return res.json({ user: refreshed });
    }

    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

function generateStarterPlots() {
  const plots = [];
  for (let x = 0; x < 6; x++) {
    for (let y = 0; y < 4; y++) {
      plots.push({ x, y, state: 'empty' });
    }
  }
  return plots;
}

export default router;
