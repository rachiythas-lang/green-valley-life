import { prisma } from '../index.js';

/** คำนวณเลเวลจาก EXP — ต้องการ level*100 EXP ต่อเลเวล */
export async function applyLevelUp(userId: string) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) return null;

  let { level, experience, maxEnergy, energy } = character;
  let leveled = false;

  while (experience >= level * 100 && level < 99) {
    experience -= level * 100;
    level += 1;
    maxEnergy = 100 + (level - 1) * 10;
    energy = maxEnergy; // ฟื้นเต็มตอนเลเวลอัพ
    leveled = true;
  }

  if (leveled) {
    return prisma.character.update({
      where: { userId },
      data: { level, experience, maxEnergy, energy },
    });
  }
  return character;
}

export async function addExp(userId: string, amount: number) {
  await prisma.character.update({
    where: { userId },
    data: { experience: { increment: amount } },
  });
  return applyLevelUp(userId);
}
