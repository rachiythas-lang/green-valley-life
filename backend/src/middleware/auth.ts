import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';

export interface AuthRequest extends Request {
  userId?: string;
  user?: any;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev') as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { character: true },
    });
    if (!user || user.isBanned) return res.status(401).json({ error: 'Unauthorized' });
    req.userId = user.id;
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
