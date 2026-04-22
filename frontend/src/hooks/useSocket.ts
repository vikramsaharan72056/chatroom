import { useEffect } from 'react';
import { reconnectSocket } from '../services/socket';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { addMessage, setRoomHistory, setTyping } from '../features/messages/messagesSlice';
import { setRoomPresence } from '../features/presence/presenceSlice';
import { setEditorContent } from '../features/editor/editorSlice';
import type { Message } from '../types';
import toast from 'react-hot-toast';

/**
 * Registers all socket event listeners.
 * Must be called exactly ONCE in the component tree (AppRoutes).
 * Reconnects the socket whenever the access token changes so
 * listeners are always on the live socket instance.
 */
export const useSocket = () => {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((s) => s.auth.accessToken);

  useEffect(() => {
    if (!accessToken) return;

    // Reconnect to pick up the latest token — this creates a fresh
    // socket and returns it, guaranteeing our listeners attach to the
    // same instance that the server authenticates.
    const socket = reconnectSocket();

    socket.on('connect', () => {
      console.log('[socket] connected', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('[socket] connect_error', err.message);
      toast.error('Connection lost. Reconnecting…');
    });

    socket.on('error', (err: { message: string }) => {
      console.error('[socket] error', err.message);
      toast.error(err.message);
    });

    socket.on('new_message', ({ roomId, message }: { roomId: string; message: Message }) => {
      dispatch(addMessage({ roomId, message }));
    });

    socket.on('room_history', ({ roomId, messages }: { roomId: string; messages: Message[] }) => {
      dispatch(setRoomHistory({ roomId, messages }));
    });

    socket.on('presence_update', ({ roomId, onlineMembers }: { roomId: string; onlineMembers: string[] }) => {
      dispatch(setRoomPresence({ roomId, onlineMembers }));
    });

    socket.on('user_typing', ({ roomId, userId, userName, isTyping }: { roomId: string; userId: string; userName: string; isTyping: boolean }) => {
      console.log(`[socket] user_typing: ${userName} is typing: ${isTyping}`);
      dispatch(setTyping({ roomId, userId, userName, isTyping }));
    });

    socket.on('user_joined', ({ userName }: { userName: string; roomId: string }) => {
      toast(`${userName} joined`, { icon: '👋', duration: 2000 });
    });

    socket.on('user_left', ({ userName }: { userName: string; roomId: string }) => {
      toast(`${userName} left`, { icon: '🚪', duration: 2000 });
    });

    socket.on('editor_state', ({ roomId, content }: { roomId: string; content: string }) => {
      dispatch(setEditorContent({ roomId, content }));
    });

    socket.on('editor_update', ({ roomId, content }: { roomId: string; content: string }) => {
      dispatch(setEditorContent({ roomId, content }));
    });

    const heartbeat = setInterval(() => socket.emit('heartbeat'), 30000);

    return () => {
      clearInterval(heartbeat);
      socket.off('connect');
      socket.off('new_message');
      socket.off('room_history');
      socket.off('presence_update');
      socket.off('user_typing');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('editor_state');
      socket.off('editor_update');
      socket.off('connect_error');
    };
  }, [accessToken, dispatch]);
};
