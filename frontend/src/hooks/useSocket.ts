import { useEffect, useRef } from 'react';
import { getSocket } from '../services/socket';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { addMessage, setRoomHistory, setTyping } from '../features/messages/messagesSlice';
import { setRoomPresence } from '../features/presence/presenceSlice';
import type { Message } from '../types';
import toast from 'react-hot-toast';

export const useSocket = () => {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const initialised = useRef(false);

  useEffect(() => {
    if (!accessToken || initialised.current) return;
    initialised.current = true;

    const socket = getSocket();

    socket.on('connect_error', () => {
      toast.error('Connection lost. Reconnecting...');
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
      dispatch(setTyping({ roomId, userId, userName, isTyping }));
    });

    socket.on('user_joined', ({ userName }: { userName: string; roomId: string }) => {
      toast(`${userName} joined`, { icon: '👋', duration: 2000 });
    });

    socket.on('user_left', ({ userName }: { userName: string; roomId: string }) => {
      toast(`${userName} left`, { icon: '🚪', duration: 2000 });
    });

    const heartbeat = setInterval(() => socket.emit('heartbeat'), 30000);

    return () => {
      clearInterval(heartbeat);
      socket.off('new_message');
      socket.off('room_history');
      socket.off('presence_update');
      socket.off('user_typing');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('connect_error');
      initialised.current = false;
    };
  }, [accessToken, dispatch]);

  const joinRoom = (roomId: string) => {
    getSocket().emit('join_room', { roomId });
  };

  const leaveRoom = (roomId: string) => {
    getSocket().emit('leave_room', { roomId });
  };

  const sendMessage = (roomId: string, content: string, replyToId?: string) => {
    getSocket().emit('send_message', { roomId, content, replyToId });
  };

  const sendTyping = (roomId: string, isTyping: boolean) => {
    getSocket().emit('typing', { roomId, isTyping });
  };

  return { joinRoom, leaveRoom, sendMessage, sendTyping };
};
