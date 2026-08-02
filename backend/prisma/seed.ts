import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Daily Quests
  const quests = [
    {
      code: 'daily_plant_3',
      type: 'daily',
      titleTh: 'ปลูกพืช 3 แปลง',
      titleEn: 'Plant 3 crops',
      descriptionTh: 'ปลูกพืชใดก็ได้ 3 แปลง',
      descriptionEn: 'Plant any crop on 3 plots',
      requirements: { plant: 3 },
      rewards: { coin: 50, exp: 20 },
    },
    {
      code: 'daily_harvest_5',
      type: 'daily',
      titleTh: 'เก็บเกี่ยว 5 ครั้ง',
      titleEn: 'Harvest 5 times',
      descriptionTh: 'เก็บเกี่ยวพืชผล 5 ครั้ง',
      descriptionEn: 'Harvest crops 5 times',
      requirements: { harvest: 5 },
      rewards: { coin: 80, exp: 30 },
    },
    {
      code: 'daily_water_5',
      type: 'daily',
      titleTh: 'รดน้ำ 5 แปลง',
      titleEn: 'Water 5 plots',
      descriptionTh: 'รดน้ำพืช 5 แปลง',
      descriptionEn: 'Water 5 planted plots',
      requirements: { water: 5 },
      rewards: { coin: 40, exp: 15 },
    },
  ];

  for (const q of quests) {
    await prisma.quest.upsert({
      where: { code: q.code },
      create: q,
      update: q,
    });
  }

  // Item Catalog ตัวอย่าง
  const items = [
    { id: 'seed_tomato', nameTh: 'เมล็ดมะเขือเทศ', nameEn: 'Tomato Seed', category: 'seed', sellPrice: 5, buyPrice: 15, data: { growthMs: 60000 } },
    { id: 'seed_carrot', nameTh: 'เมล็ดแครอท', nameEn: 'Carrot Seed', category: 'seed', sellPrice: 4, buyPrice: 12 },
    { id: 'crop_tomato', nameTh: 'มะเขือเทศ', nameEn: 'Tomato', category: 'crop', sellPrice: 25, buyPrice: 0 },
    { id: 'crop_carrot', nameTh: 'แครอท', nameEn: 'Carrot', category: 'crop', sellPrice: 18, buyPrice: 0 },
    { id: 'coin', nameTh: 'เหรียญ', nameEn: 'Coin', category: 'currency', sellPrice: 0, buyPrice: 0 },
  ];

  for (const item of items) {
    await prisma.itemCatalog.upsert({
      where: { id: item.id },
      create: item as any,
      update: item as any,
    });
  }

  console.log('✅ Seed completed');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
