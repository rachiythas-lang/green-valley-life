import { Router } from 'express';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

const SHOP_ITEMS = [
  { id: 'seed_tomato', nameTh: 'เมล็ดมะเขือเทศ', nameEn: 'Tomato Seed', buyPrice: 12, sellPrice: 4, category: 'seed' },
  { id: 'seed_carrot', nameTh: 'เมล็ดแครอท', nameEn: 'Carrot Seed', buyPrice: 12, sellPrice: 4, category: 'seed' },
  { id: 'seed_wheat', nameTh: 'เมล็ดข้าวสาลี', nameEn: 'Wheat Seed', buyPrice: 10, sellPrice: 3, category: 'seed' },
  { id: 'seed_potato', nameTh: 'เมล็ดมันฝรั่ง', nameEn: 'Potato Seed', buyPrice: 14, sellPrice: 4, category: 'seed' },
  { id: 'seed_corn', nameTh: 'เมล็ดข้าวโพด', nameEn: 'Corn Seed', buyPrice: 18, sellPrice: 6, category: 'seed' },
  { id: 'seed_strawberry', nameTh: 'เมล็ดสตรอว์เบอร์รี', nameEn: 'Strawberry Seed', buyPrice: 25, sellPrice: 8, category: 'seed' },
  { id: 'fertilizer', nameTh: 'ปุ๋ย', nameEn: 'Fertilizer', buyPrice: 30, sellPrice: 10, category: 'consumable' },
  { id: 'crop_tomato', nameTh: 'มะเขือเทศ', nameEn: 'Tomato', buyPrice: 0, sellPrice: 25, category: 'crop' },
  { id: 'crop_carrot', nameTh: 'แครอท', nameEn: 'Carrot', buyPrice: 0, sellPrice: 18, category: 'crop' },
  { id: 'crop_wheat', nameTh: 'ข้าวสาลี', nameEn: 'Wheat', buyPrice: 0, sellPrice: 15, category: 'crop' },
  { id: 'crop_potato', nameTh: 'มันฝรั่ง', nameEn: 'Potato', buyPrice: 0, sellPrice: 20, category: 'crop' },
  { id: 'crop_corn', nameTh: 'ข้าวโพด', nameEn: 'Corn', buyPrice: 0, sellPrice: 30, category: 'crop' },
  { id: 'crop_strawberry', nameTh: 'สตรอว์เบอร์รี', nameEn: 'Strawberry', buyPrice: 0, sellPrice: 40, category: 'crop' },
  { id: 'egg', nameTh: 'ไข่ไก่', nameEn: 'Egg', buyPrice: 0, sellPrice: 20, category: 'product' },
  { id: 'milk', nameTh: 'นม', nameEn: 'Milk', buyPrice: 0, sellPrice: 45, category: 'product' },
  { id: 'wool', nameTh: 'ขนแกะ', nameEn: 'Wool', buyPrice: 0, sellPrice: 35, category: 'product' },
  { id: 'fish_carp', nameTh: 'ปลาตะเพียน', nameEn: 'Carp', buyPrice: 0, sellPrice: 20, category: 'fish' },
  { id: 'fish_catfish', nameTh: 'ปลาดุก', nameEn: 'Catfish', buyPrice: 0, sellPrice: 35, category: 'fish' },
  { id: 'fish_bass', nameTh: 'ปลากะพง', nameEn: 'Bass', buyPrice: 0, sellPrice: 50, category: 'fish' },
  { id: 'fish_salmon', nameTh: 'ปลาแซลมอน', nameEn: 'Salmon', buyPrice: 0, sellPrice: 80, category: 'fish' },
  { id: 'fish_tuna', nameTh: 'ปลาทูน่า', nameEn: 'Tuna', buyPrice: 0, sellPrice: 150, category: 'fish' },
  { id: 'fish_golden', nameTh: 'ปลาทองตำนาน', nameEn: 'Golden Fish', buyPrice: 0, sellPrice: 500, category: 'fish' },
  { id: 'ore_coal', nameTh: 'ถ่านหิน', nameEn: 'Coal', buyPrice: 0, sellPrice: 8, category: 'ore' },
  { id: 'ore_iron', nameTh: 'แร่เหล็ก', nameEn: 'Iron Ore', buyPrice: 0, sellPrice: 18, category: 'ore' },
  { id: 'ore_silver', nameTh: 'แร่เงิน', nameEn: 'Silver Ore', buyPrice: 0, sellPrice: 40, category: 'ore' },
  { id: 'ore_gold', nameTh: 'แร่ทอง', nameEn: 'Gold Ore', buyPrice: 0, sellPrice: 80, category: 'ore' },
  { id: 'ore_crystal', nameTh: 'คริสตัล', nameEn: 'Crystal', buyPrice: 0, sellPrice: 120, category: 'ore' },
  { id: 'ore_ruby', nameTh: 'ทับทิม', nameEn: 'Ruby', buyPrice: 0, sellPrice: 200, category: 'ore' },
  { id: 'ore_diamond', nameTh: 'เพชร', nameEn: 'Diamond', buyPrice: 0, sellPrice: 400, category: 'ore' },
  { id: 'ore_stone', nameTh: 'หิน', nameEn: 'Stone', buyPrice: 0, sellPrice: 3, category: 'ore' },
  { id: 'bar_iron', nameTh: 'แท่งเหล็ก', nameEn: 'Iron Bar', buyPrice: 0, sellPrice: 70, category: 'material' },
  { id: 'bar_gold', nameTh: 'แท่งทอง', nameEn: 'Gold Bar', buyPrice: 0, sellPrice: 280, category: 'material' },
  { id: 'food_bread', nameTh: 'ขนมปัง', nameEn: 'Bread', buyPrice: 0, sellPrice: 25, category: 'food' },
  { id: 'food_salad', nameTh: 'สลัด', nameEn: 'Salad', buyPrice: 0, sellPrice: 45, category: 'food' },
  { id: 'drink_juice', nameTh: 'น้ำผลไม้', nameEn: 'Juice', buyPrice: 0, sellPrice: 60, category: 'food' },
];

router.get('/', (_req, res) => {
  res.json({ items: SHOP_ITEMS });
});

// ซื้อของ
router.post('/buy', async (req: AuthRequest, res) => {
  const schema = z.object({
    itemId: z.string(),
    quantity: z.number().int().min(1).max(99).default(1),
  });
  const { itemId, quantity } = schema.parse(req.body);
  const item = SHOP_ITEMS.find((i) => i.id === itemId && i.buyPrice > 0);
  if (!item) return res.status(400).json({ error: 'Item not for sale' });

  const total = item.buyPrice * quantity;
  const coin = await prisma.inventoryItem.findUnique({
    where: { userId_itemId: { userId: req.userId!, itemId: 'coin' } },
  });
  if (!coin || coin.quantity < total) {
    return res.status(400).json({ error: 'Not enough coins' });
  }

  await prisma.inventoryItem.update({
    where: { id: coin.id },
    data: { quantity: { decrement: total } },
  });

  await prisma.inventoryItem.upsert({
    where: { userId_itemId: { userId: req.userId!, itemId } },
    create: { userId: req.userId!, itemId, quantity },
    update: { quantity: { increment: quantity } },
  });

  await prisma.transaction.create({
    data: {
      userId: req.userId!,
      type: 'spend',
      currency: 'coin',
      amount: total,
      description: `Buy ${quantity}x ${itemId}`,
    },
  });

  res.json({ ok: true, spent: total, itemId, quantity });
});

// ขายของ
router.post('/sell', async (req: AuthRequest, res) => {
  const schema = z.object({
    itemId: z.string(),
    quantity: z.number().int().min(1).max(999).default(1),
  });
  const { itemId, quantity } = schema.parse(req.body);
  const item = SHOP_ITEMS.find((i) => i.id === itemId);
  if (!item || item.sellPrice <= 0) {
    return res.status(400).json({ error: 'Cannot sell this item' });
  }

  const inv = await prisma.inventoryItem.findUnique({
    where: { userId_itemId: { userId: req.userId!, itemId } },
  });
  if (!inv || inv.quantity < quantity) {
    return res.status(400).json({ error: 'Not enough items' });
  }

  const total = item.sellPrice * quantity;

  await prisma.inventoryItem.update({
    where: { id: inv.id },
    data: { quantity: { decrement: quantity } },
  });

  await prisma.inventoryItem.upsert({
    where: { userId_itemId: { userId: req.userId!, itemId: 'coin' } },
    create: { userId: req.userId!, itemId: 'coin', quantity: total },
    update: { quantity: { increment: total } },
  });

  await prisma.transaction.create({
    data: {
      userId: req.userId!,
      type: 'earn',
      currency: 'coin',
      amount: total,
      description: `Sell ${quantity}x ${itemId}`,
    },
  });

  res.json({ ok: true, earned: total, itemId, quantity });
});

export default router;
