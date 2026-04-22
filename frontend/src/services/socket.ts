import { io, Socket } from 'socket.io-client';
import { store } from '../app/store';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const token = store.getState().auth.accessToken;
    socket = io(window.location.origin, {
      path: '/socket.io',
      auth: { token },
      withCredentials: true,
      transports: ['polling', 'websocket'],
      upgrade: true,
    });
  }
  return socket;
};

export const disconnectSocket = (): void => {
  socket?.disconnect();
  socket = null;
};

export const reconnectSocket = (): Socket => {
  disconnectSocket();
  return getSocket();
};

/* ── Room action helpers (emit-only, no listeners) ── */

export const emitJoinRoom = (roomId: string): void => {
  getSocket().emit('join_room', { roomId });
};

export const emitLeaveRoom = (roomId: string): void => {
  getSocket().emit('leave_room', { roomId });
};

export const emitSendMessage = (roomId: string, content: string, replyToId?: string): void => {
  getSocket().emit('send_message', { roomId, content, replyToId });
};

export const emitTyping = (roomId: string, isTyping: boolean): void => {
  getSocket().emit('typing', { roomId, isTyping });
};

export const emitEditorUpdate = (roomId: string, content: string): void => {
  getSocket().emit('editor_update', { roomId, content });
};
