import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import roomReducer from '../features/room/roomSlice';
import messagesReducer from '../features/messages/messagesSlice';
import presenceReducer from '../features/presence/presenceSlice';
import editorReducer from '../features/editor/editorSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    room: roomReducer,
    messages: messagesReducer,
    presence: presenceReducer,
    editor: editorReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
