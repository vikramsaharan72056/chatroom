import { io, Socket } from 'socket.io-client';
import { store } from '../app/store';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const token = store.getState().auth.accessToken;
    socket = io('/', {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
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
