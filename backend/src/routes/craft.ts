import { Router } from 'express';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

const RECIPES = [
  {
    id: 'craft_bread',
    nameTh: 'ขนมปัง',
    nameEn: 'Bread',
    category: 'food',
    result: { itemId: 'food_bread', qty: 2 },
    ingredients: [{ itemId: 'crop_wheat', qty: 3 }],
    sellPrice: 25,
  },
  {
    id: 'craft_salad',
    nameTh: 'สลัดผัก',
    nameEn: 'Salad',
    category: 'food',
    result: { itemId: 'food_salad', qty: 1 },
    ingredients: [
      { itemId: 'crop_tomato', qty: 2 },
      { itemId: 'crop_carrot', qty: 1 },
    ],
    sellPrice: 45,
  },
  {
    id: 'craft_juice',
    nameTh: 'น้ำผลไม้',
    nameEn: 'Fruit Juice',
    category: 'drink',
    result: { itemId: 'drink_juice', qty: 1 },
    ingredients: [{ itemId: 'crop_strawberry', qty: 3 }],
    sellPrice: 60,
  },
  {
    id: 'craft_iron_bar',
    nameTh: 'แท่งเหล็ก',
    nameEn: 'Iron Bar',
    category: 'material',
    result: { itemId: 'bar_iron', qty: 1 },
    ingredients: [
      { itemId: 'ore_iron', qty: 3 },
      { itemId: 'ore_coal', qty: 1 },
    ],
    sellPrice: 70,
  },
  {
    id: 'craft_gold_bar',
    nameTh: 'แท่งทอง',
    nameEn: 'Gold Bar',
    category: 'material',
    result: { itemId: 'bar_gold', qty: 1 },
    ingredients: [
      { itemId: 'ore_gold', qty: 3 },
      { itemId: 'ore_coal', qty: 2 },
    ],
    sellPrice: 280,
  },
  {
    id: 'craft_pickaxe',
    nameTh: 'จอบขุดแร่',
    nameEn: 'Pickaxe',
    category: 'tool',
    result: { itemId: 'tool_pickaxe', qty: 1 },
    ingredients: [
      { itemId: 'bar_iron', qty: 2 },
      { itemId: 'ore_stone', qty: 5 },
    ],
    sellPrice: 150,
  },
  {
    id: 'craft_fence',
    nameTh: 'รั้วไม้',
    nameEn: 'Wood Fence',
    category: 'decor',
    result: { itemId: 'decor_fence', qty: 4 },
    ingredients: [{ itemId: 'ore_stone', qty: 2 }],
    sellPrice: 15,
  },
  {
    id: 'craft_fertilizer_pack',
    nameTh: 'ชุดปุ๋ย x3',
    nameEn: 'Fertilizer Pack',
    category: 'consumable',
    result: { itemId: 'fertilizer', qty: 3 },
    ingredients: [
      { itemId: 'crop_wheat', qty: 2 },
      { itemId: 'ore_stone', qty: 1 },
    ],
    sellPrice: 0,
  },
];

router.get('/recipes', (_req, res) => {
  res.json({ recipes: RECIPES });
});

router.post('/make', async (req: AuthRequest, res) => {
  const schema = z.object({
    recipeId: z.string(),
    times: z.number().int().min(1).max(20).default(1),
  });
  const { recipeId, times } = schema.parse(req.body);
  const recipe = RECIPES.find((r) => r.id === recipeId);
  if (!recipe) return res.status(400).json({ error: 'ไม่พบสูตร' });

  // เช็ควัตถุดิบ
  for (const ing of recipe.ingredients) {
    const inv = await prisma.inventoryItem.findUnique({
      where: { userId_itemId: { userId: req.userId!, itemId: ing.itemId } },
    });
    const need = ing.qty * times;
    if (!inv || inv.quantity < need) {
      return res.status(400).json({
        error: `วัตถุดิบไม่พอ: ${ing.itemId} ต้องการ ${need}`,
      });
    }
  }

  // หักของ
  for (const ing of recipe.ingredients) {
    await prisma.inventoryItem.update({
      where: { userId_itemId: { userId: req.userId!, itemId: ing.itemId } },
      data: { quantity: { decrement: ing.qty * times } },
    });
  }

  // ให้ผลลัพธ์
  const resultQty = recipe.result.qty * times;
  await prisma.inventoryItem.upsert({
    where: { userId_itemId: { userId: req.userId!, itemId: recipe.result.itemId } },
    create: { userId: req.userId!, itemId: recipe.result.itemId, quantity: resultQty },
    update: { quantity: { increment: resultQty } },
  });

  await prisma.character.update({
    where: { userId: req.userId },
    data: { experience: { increment: 5 * times } },
  });

  res.json({
    ok: true,
    recipe: recipe.nameTh,
    result: { itemId: recipe.result.itemId, quantity: resultQty },
    times,
  });
});

export default router;
