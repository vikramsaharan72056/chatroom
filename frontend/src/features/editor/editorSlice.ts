import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface EditorState {
  contentByRoom: Record<string, string>;
}

const initialState: EditorState = { contentByRoom: {} };

const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    setEditorContent(state, action: PayloadAction<{ roomId: string; content: string }>) {
      state.contentByRoom[action.payload.roomId] = action.payload.content;
    },
    clearEditorRoom(state, action: PayloadAction<string>) {
      delete state.contentByRoom[action.payload];
    },
  },
});

export const { setEditorContent, clearEditorRoom } = editorSlice.actions;
export default editorSlice.reducer;
