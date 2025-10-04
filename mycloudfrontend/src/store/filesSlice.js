import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authorizedFetch, renameFileApi } from '../utils/api';

export const fetchFiles = createAsyncThunk(
  'files/fetchFiles',
  async (_, { rejectWithValue }) => {
    try {
      const data = await authorizedFetch('/files/');
      return data.files || data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteFile = createAsyncThunk(
  'files/deleteFile',
  async (fileId, { rejectWithValue }) => {
    try {
      await authorizedFetch(`/files/${fileId}/`, { method: 'DELETE' });
      return fileId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const uploadFiles = createAsyncThunk(
  'files/uploadFiles',
  async ({ files, comment }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('comment', comment);
      files.forEach(file => formData.append('file', file));
      const data = await authorizedFetch('/files/upload/', {
        method: 'POST',
        body: formData,
      });
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateFileComment = createAsyncThunk(
  'files/updateFileComment',
  async ({ fileId, comment }, { rejectWithValue }) => {
    try {
      const data = await authorizedFetch(`/files/${fileId}/comment/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      });
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const renameFile = createAsyncThunk(
  'files/renameFile',
  async ({ fileId, newName }, { rejectWithValue }) => {
    try {
      const data = await renameFileApi(fileId, newName);
      return { id: fileId, original_name: data.original_name };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const filesSlice = createSlice({
  name: 'files',
  initialState: {
    files: [],
    loading: false,
    error: null,
    loadingIds: [],  // для гранулированных загрузок
  },
  reducers: {},
  extraReducers: builder => {
    builder
      // fetchFiles
      .addCase(fetchFiles.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFiles.fulfilled, (state, action) => {
        state.files = action.payload;
        state.loading = false;
      })
      .addCase(fetchFiles.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })

      // deleteFile
      .addCase(deleteFile.pending, (state, action) => {
        state.loadingIds.push(action.meta.arg);
        state.error = null;
      })
      .addCase(deleteFile.fulfilled, (state, action) => {
        state.files = state.files.filter(f => f.id !== action.payload);
        state.loadingIds = state.loadingIds.filter(id => id !== action.payload);
      })
      .addCase(deleteFile.rejected, (state, action) => {
        state.error = action.payload;
        state.loadingIds = state.loadingIds.filter(id => id !== action.meta.arg);
      })

      // uploadFiles
      .addCase(uploadFiles.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadFiles.fulfilled, (state, action) => {
        const payload = action.payload;
        if (Array.isArray(payload)) {
          state.files.push(...payload);
        } else {
          state.files.push(payload);
        }
        state.loading = false;
      })
      .addCase(uploadFiles.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })

      // updateFileComment
      .addCase(updateFileComment.pending, (state, action) => {
        state.loadingIds.push(action.meta.arg.fileId);
        state.error = null;
      })
      .addCase(updateFileComment.fulfilled, (state, action) => {
        const idx = state.files.findIndex(f => f.id === action.payload.id);
        if (idx !== -1) state.files[idx] = action.payload;
        state.loadingIds = state.loadingIds.filter(id => id !== action.payload.id);
      })
      .addCase(updateFileComment.rejected, (state, action) => {
        state.error = action.payload;
        state.loadingIds = state.loadingIds.filter(id => id !== action.meta.arg.fileId);
      })

      // renameFile
      .addCase(renameFile.pending, (state, action) => {
        state.loadingIds.push(action.meta.arg.fileId);
        state.error = null;
      })
      .addCase(renameFile.fulfilled, (state, action) => {
        const { id, original_name } = action.payload;
        const file = state.files.find(f => f.id === id);
        if (file) file.original_name = original_name;
        state.loadingIds = state.loadingIds.filter(x => x !== id);
      })
      .addCase(renameFile.rejected, (state, action) => {
        state.error = action.payload;
        state.loadingIds = state.loadingIds.filter(x => x !== action.meta.arg.fileId);
      });
  },
});

export default filesSlice.reducer;
