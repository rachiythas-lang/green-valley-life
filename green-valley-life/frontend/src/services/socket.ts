import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

let socket: Socket | null = null;

export function getSocket() {
  return socket;
}

export function connectSocket() {
  const token = useAuthStore.getState().token;
  if (!token) return null;

  if (socket?.connected) return socket;

  socket = io(import.meta.env.VITE_SOCKET_URL || '', {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected');
  });

  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected');
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
