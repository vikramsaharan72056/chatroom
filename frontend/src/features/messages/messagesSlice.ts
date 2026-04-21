import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Message } from '../../types';

interface MessagesState {
  byRoom: Record<string, Message[]>;
  typingUsers: Record<string, Record<string, string>>;
}

const initialState: MessagesState = {
  byRoom: {},
  typingUsers: {},
};

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    setRoomHistory(state, action: PayloadAction<{ roomId: string; messages: Message[] }>) {
      state.byRoom[action.payload.roomId] = action.payload.messages;
    },
    addMessage(state, action: PayloadAction<{ roomId: string; message: Message }>) {
      const { roomId, message } = action.payload;
      if (!state.byRoom[roomId]) state.byRoom[roomId] = [];
      state.byRoom[roomId].push(message);
    },
    setTyping(state, action: PayloadAction<{ roomId: string; userId: string; userName: string; isTyping: boolean }>) {
      const { roomId, userId, userName, isTyping } = action.payload;
      if (!state.typingUsers[roomId]) state.typingUsers[roomId] = {};
      if (isTyping) {
        state.typingUsers[roomId][userId] = userName;
      } else {
        delete state.typingUsers[roomId][userId];
      }
    },
    clearRoom(state, action: PayloadAction<string>) {
      delete state.byRoom[action.payload];
      delete state.typingUsers[action.payload];
    },
  },
});

export const { setRoomHistory, addMessage, setTyping, clearRoom } = messagesSlice.actions;
export default messagesSlice.reducer;
