import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';

interface PlayerState {
  userId: string;
  displayName: string;
  character: any;
  x: number;
  y: number;
  map: string;
  farmId?: string;
}

const onlinePlayers = new Map<string, PlayerState>(); // socketId -> state
const userSocketMap = new Map<string, string>(); // userId -> socketId

export function setupSocket(io: Server) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Auth required'));

      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as { userId: string };
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: { character: true, farm: true },
      });
      if (!user || user.isBanned) return next(new Error('Unauthorized'));

      (socket as any).user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    console.log(`✅ Player connected: ${user.displayName} (${user.id})`);

    // ลงทะเบียนผู้เล่นออนไลน์
    const state: PlayerState = {
      userId: user.id,
      displayName: user.displayName,
      character: user.character,
      x: user.character?.posX || 0,
      y: user.character?.posY || 0,
      map: user.character?.currentMap || 'farm',
      farmId: user.farm?.id,
    };
    onlinePlayers.set(socket.id, state);
    userSocketMap.set(user.id, socket.id);

    // เข้าร่วมห้องฟาร์มของตัวเอง
    socket.join(`farm:${user.farm?.id}`);
    socket.join('global');

    // แจ้งคนอื่นว่ามีคนเข้า
    socket.broadcast.emit('player:joined', {
      userId: user.id,
      displayName: user.displayName,
      character: user.character,
      x: state.x,
      y: state.y,
      map: state.map,
    });

    // ส่งรายชื่อผู้เล่นออนไลน์ให้คนใหม่
    const others = Array.from(onlinePlayers.values()).filter((p) => p.userId !== user.id);
    socket.emit('players:list', others);

    // อัปเดตตำแหน่ง
    socket.on('player:move', (data: { x: number; y: number; map?: string }) => {
      const s = onlinePlayers.get(socket.id);
      if (!s) return;
      s.x = data.x;
      s.y = data.y;
      if (data.map) s.map = data.map;

      socket.broadcast.emit('player:moved', {
        userId: user.id,
        x: data.x,
        y: data.y,
        map: s.map,
      });
    });

    // แชท
    socket.on('chat:message', async (data: { content: string; roomId?: string }) => {
      const roomId = data.roomId || 'global';
      const content = (data.content || '').trim().slice(0, 200);
      if (!content) return;

      const message = await prisma.chatMessage.create({
        data: {
          userId: user.id,
          roomId,
          content,
          type: 'text',
        },
      });

      const payload = {
        id: message.id,
        userId: user.id,
        displayName: user.displayName,
        content,
        roomId,
        createdAt: message.createdAt,
      };

      if (roomId === 'global') {
        io.emit('chat:message', payload);
      } else {
        io.to(roomId).emit('chat:message', payload);
      }
    });

    // ไปเยี่ยมฟาร์มคนอื่น
    socket.on('farm:visit', async (data: { targetUserId: string }) => {
      const targetFarm = await prisma.farm.findUnique({
        where: { userId: data.targetUserId },
        include: { plots: true, animals: true, user: { select: { displayName: true } } },
      });
      if (!targetFarm) {
        socket.emit('error', { message: 'Farm not found' });
        return;
      }

      // ออกจากห้องฟาร์มเดิม
      if (state.farmId) socket.leave(`farm:${state.farmId}`);

      // เข้าห้องฟาร์มใหม่
      socket.join(`farm:${targetFarm.id}`);
      state.farmId = targetFarm.id;
      state.map = 'visit';

      socket.emit('farm:visited', {
        farm: targetFarm,
        ownerName: targetFarm.user.displayName,
      });

      // แจ้งเจ้าของฟาร์ม (ถ้าออนไลน์)
      const ownerSocketId = userSocketMap.get(data.targetUserId);
      if (ownerSocketId) {
        io.to(ownerSocketId).emit('farm:visitor', {
          userId: user.id,
          displayName: user.displayName,
        });
      }
    });

    // กลับฟาร์มตัวเอง
    socket.on('farm:return', async () => {
      const myFarm = await prisma.farm.findUnique({ where: { userId: user.id } });
      if (!myFarm) return;

      if (state.farmId) socket.leave(`farm:${state.farmId}`);
      socket.join(`farm:${myFarm.id}`);
      state.farmId = myFarm.id;
      state.map = 'farm';

      socket.emit('farm:returned', { farmId: myFarm.id });
    });

    // อัปเดตแปลงปลูกแบบ realtime (ให้คนที่มาเยี่ยมเห็น)
    socket.on('farm:plot-update', (data: { plot: any }) => {
      if (state.farmId) {
        socket.to(`farm:${state.farmId}`).emit('farm:plot-updated', {
          userId: user.id,
          plot: data.plot,
        });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`❌ Player disconnected: ${user.displayName}`);
      onlinePlayers.delete(socket.id);
      userSocketMap.delete(user.id);
      socket.broadcast.emit('player:left', { userId: user.id });
    });
  });
}
