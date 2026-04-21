import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface PresenceState {
  onlineByRoom: Record<string, string[]>;
}

const initialState: PresenceState = { onlineByRoom: {} };

const presenceSlice = createSlice({
  name: 'presence',
  initialState,
  reducers: {
    setRoomPresence(state, action: PayloadAction<{ roomId: string; onlineMembers: string[] }>) {
      state.onlineByRoom[action.payload.roomId] = action.payload.onlineMembers;
    },
  },
});

export const { setRoomPresence } = presenceSlice.actions;
export default presenceSlice.reducer;
