import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../index.js';
import { isMorningLogin, syncLoginToGoogleSheets } from '../utils/sheets.js';

const router = Router();

function createToken(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'dev', { expiresIn: '30d' });
}

function starterPlots() {
  const plots = [];
  for (let x = 0; x < 6; x++) {
    for (let y = 0; y < 4; y++) {
      plots.push({ x, y, state: 'empty' });
    }
  }
  return plots;
}

async function giveStarterItems(userId: string) {
  await prisma.inventoryItem.createMany({
    data: [
      { userId, itemId: 'coin', quantity: 500 },
      { userId, itemId: 'seed_tomato', quantity: 10 },
      { userId, itemId: 'seed_carrot', quantity: 10 },
      { userId, itemId: 'watering_can', quantity: 1 },
      { userId, itemId: 'hoe', quantity: 1 },
    ],
  });
}

async function recordLogin(userId: string, displayName: string, email: string | null, provider: string, loginStreak: number) {
  const morning = isMorningLogin();
  const log = await prisma.loginLog.create({
    data: { userId, isMorning: morning },
  });

  const synced = await syncLoginToGoogleSheets({
    timestamp: new Date().toISOString(),
    userId,
    displayName,
    email: email || '',
    isMorning: morning,
    loginStreak,
    provider,
  });

  if (synced) {
    await prisma.loginLog.update({ where: { id: log.id }, data: { synced: true } });
  }

  return { morning, logId: log.id };
}

// ---------- สมัครสมาชิก Email ----------
router.post('/register', async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6).max(64),
      displayName: z.string().min(2).max(20),
    });
    const data = schema.parse(req.body);

    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) return res.status(400).json({ error: 'อีเมลนี้ถูกใช้แล้ว' });

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        displayName: data.displayName,
        provider: 'email',
        lastLoginAt: new Date(),
        loginStreak: 1,
        character: { create: { name: data.displayName, gender: 'male' } },
        farm: {
          create: {
            name: `${data.displayName}'s Farm`,
            plots: { create: starterPlots() },
          },
        },
      },
      include: { character: true, farm: { include: { plots: true } } },
    });

    await giveStarterItems(user.id);
    await recordLogin(user.id, user.displayName, user.email, 'email', 1);

    const token = createToken(user.id);
    res.json({ token, user, isMorning: isMorningLogin() });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'สมัครไม่สำเร็จ' });
  }
});

// ---------- เข้าสู่ระบบ Email ----------
router.post('/login', async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    });
    const data = schema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        character: true,
        farm: { include: { plots: true, animals: true } },
        inventory: true,
      },
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    if (user.isBanned) return res.status(403).json({ error: 'บัญชีถูกระงับ' });

    // streak: ถ้า login วันถัดไปติดกัน +1, ขาดวัน = 1
    const last = user.lastLoginAt ? new Date(user.lastLoginAt) : null;
    const now = new Date();
    let streak = user.loginStreak || 0;
    if (last) {
      const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate()).getTime();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const diffDays = Math.round((today - lastDay) / 86400000);
      if (diffDays === 0) {
        // login ซ้ำวันเดียวกัน ไม่เพิ่ม streak
      } else if (diffDays === 1) {
        streak += 1;
      } else {
        streak = 1;
      }
    } else {
      streak = 1;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: now, loginStreak: streak },
    });

    const { morning } = await recordLogin(user.id, user.displayName, user.email, user.provider, streak);

    // โบนัสเช้า
    let morningBonus = null;
    if (morning) {
      await prisma.inventoryItem.upsert({
        where: { userId_itemId: { userId: user.id, itemId: 'coin' } },
        create: { userId: user.id, itemId: 'coin', quantity: 50 },
        update: { quantity: { increment: 50 } },
      });
      morningBonus = { coin: 50, message: 'โบนัสเข้าใช้งานตอนเช้า! +50 เหรียญ' };
    }

    const token = createToken(user.id);
    const fresh = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        character: true,
        farm: { include: { plots: true, animals: true } },
        inventory: true,
      },
    });

    res.json({
      token,
      user: fresh,
      isMorning: morning,
      loginStreak: streak,
      morningBonus,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'เข้าสู่ระบบไม่สำเร็จ' });
  }
});

// ---------- Guest ----------
router.post('/guest', async (req, res) => {
  try {
    const name = (req.body.displayName || `ชาวนา${Math.floor(Math.random() * 9000 + 1000)}`).slice(0, 16);
    const user = await prisma.user.create({
      data: {
        displayName: name,
        provider: 'guest',
        lastLoginAt: new Date(),
        loginStreak: 1,
        character: { create: { name, gender: 'male' } },
        farm: {
          create: {
            name: `${name}'s Farm`,
            plots: { create: starterPlots() },
          },
        },
      },
      include: { character: true, farm: { include: { plots: true } } },
    });
    await giveStarterItems(user.id);
    const { morning } = await recordLogin(user.id, user.displayName, null, 'guest', 1);

    const token = createToken(user.id);
    res.json({ token, user, isMorning: morning, loginStreak: 1 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Me ----------
router.get('/me', async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev') as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        character: true,
        farm: { include: { plots: true, animals: true } },
        inventory: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({ user, loginStreak: user.loginStreak });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// ---------- สถิติ login เช้า (admin ง่าย ๆ) ----------
router.get('/morning-stats', async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const count = await prisma.loginLog.count({
      where: { isMorning: true, loginAt: { gte: today } },
    });
    const recent = await prisma.loginLog.findMany({
      where: { isMorning: true },
      orderBy: { loginAt: 'desc' },
      take: 20,
      include: { user: { select: { displayName: true, email: true } } },
    });
    res.json({ morningLoginsToday: count, recent });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
