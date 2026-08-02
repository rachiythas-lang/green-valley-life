import { Router } from 'express';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

function calcTimeOfDay() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 16) return 'afternoon';
  if (h >= 16 && h < 19) return 'evening';
  return 'night';
}

function calcWeather() {
  // สุ่มคงที่ต่อชั่วโมง เพื่อไม่กระพริบทุก request
  const hourKey = Math.floor(Date.now() / 3600000);
  const r = (hourKey * 17) % 100;
  if (r < 55) return 'sunny';
  if (r < 75) return 'cloudy';
  if (r < 90) return 'rain';
  return 'windy';
}

router.get('/state', async (req: AuthRequest, res) => {
  const timeOfDay = calcTimeOfDay();
  const weather = calcWeather();

  // บันทึกลงฟาร์ม (optional)
  await prisma.farm.updateMany({
    where: { userId: req.userId },
    data: { timeOfDay, weather },
  });

  res.json({
    timeOfDay,
    weather,
    zones: [
      { id: 'farm', nameTh: 'โซนฟาร์ม', x: 200, y: 280 },
      { id: 'home', nameTh: 'โซนบ้าน', x: 750, y: 200 },
      { id: 'water', nameTh: 'โซนน้ำ', x: 1000, y: 420 },
      { id: 'pen', nameTh: 'คอกสัตว์', x: 250, y: 540 },
    ],
    npcs: [
      {
        id: 'mint',
        name: 'มิ้นท์',
        role: 'shop',
        x: 620,
        y: 280,
        lines: [
          'สวัสดีจ้า! อยากซื้อเมล็ดไหม?',
          'วันนี้อากาศดีจัง น่าปลูกผัก',
          'เควสของฉันอยู่บนจอนะ ช่วยหน่อยสิ!',
        ],
      },
      {
        id: 'uncle_fish',
        name: 'ลุงปลา',
        role: 'fish',
        x: 980,
        y: 460,
        lines: [
          'บ่อนี้มีปลาเยอะนะ ลองโยนเบ็ดสิ',
          'เก็บเกี่ยวเสร็จแล้วค่อยมาตกปลา',
          'ปลาทองหายากมาก ๆ เลย!',
        ],
      },
    ],
  });
});

export default router;
