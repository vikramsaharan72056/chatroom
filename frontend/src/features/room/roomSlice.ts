import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import type { Room } from '../../types';

interface RoomState {
  myRooms: Room[];
  publicRooms: Room[];
  activeRoom: Room | null;
  loading: boolean;
  error: string | null;
}

const initialState: RoomState = {
  myRooms: [],
  publicRooms: [],
  activeRoom: null,
  loading: false,
  error: null,
};

export const fetchMyRooms = createAsyncThunk('room/fetchMy', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/rooms/my');
    return data as Room[];
  } catch {
    return rejectWithValue('Failed to load rooms');
  }
});

export const fetchPublicRooms = createAsyncThunk('room/fetchPublic', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/rooms/public');
    return data as Room[];
  } catch {
    return rejectWithValue('Failed to load rooms');
  }
});

export const fetchRoom = createAsyncThunk('room/fetchOne', async (id: string, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/rooms/${id}`);
    return data as Room;
  } catch {
    return rejectWithValue('Room not found');
  }
});

export const createRoom = createAsyncThunk(
  'room/create',
  async (payload: { name: string; description?: string; type: 'public' | 'private'; password?: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/rooms', payload);
      return data as Room;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Failed to create room';
      return rejectWithValue(msg);
    }
  },
);

export const joinRoom = createAsyncThunk(
  'room/join',
  async (payload: { roomId: string; password?: string; inviteToken?: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/rooms/join', payload);
      return data as Room;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Failed to join room';
      return rejectWithValue(msg);
    }
  },
);

const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    setActiveRoom(state, action: PayloadAction<Room | null>) {
      state.activeRoom = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyRooms.fulfilled, (state, action) => {
        state.myRooms = action.payload;
      })
      .addCase(fetchPublicRooms.fulfilled, (state, action) => {
        state.publicRooms = action.payload;
      })
      .addCase(fetchRoom.fulfilled, (state, action) => {
        state.activeRoom = action.payload;
      })
      .addCase(createRoom.fulfilled, (state, action) => {
        state.myRooms.unshift(action.payload);
        state.loading = false;
      })
      .addCase(createRoom.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createRoom.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(joinRoom.fulfilled, (state, action) => {
        const exists = state.myRooms.find((r) => r._id === action.payload._id);
        if (!exists) state.myRooms.unshift(action.payload);
        state.loading = false;
      })
      .addCase(joinRoom.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(joinRoom.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setActiveRoom, clearError } = roomSlice.actions;
export default roomSlice.reducer;
