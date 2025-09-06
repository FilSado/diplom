import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authorizedFetch } from '../utils/api';

// Получение списка файлов
export const fetchFiles = createAsyncThunk(
  'files/fetchFiles',
  async (_, { rejectWithValue }) => {
    try {
      const data = await authorizedFetch('/files/');
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Удаление файла
export const deleteFile = createAsyncThunk(
  'files/deleteFile',
  async (fileId, { rejectWithValue }) => {
    try {
      await authorizedFetch(`/files/${fileId}/`, {
        method: 'DELETE',
      });
      return fileId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Загрузка файла
export const uploadFile = createAsyncThunk(
  'files/uploadFile',
  async ({ file, comment }, { rejectWithValue }) => {
    try {
      const tokens = JSON.parse(localStorage.getItem('tokens'));
      const formData = new FormData();
      formData.append('file', file);
      formData.append('comment', comment);

      const response = await fetch('/api/files/upload/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.access}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка загрузки файла');
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Обновление комментария к файлу
export const updateFileComment = createAsyncThunk(
  'files/updateFileComment',
  async ({ fileId, comment }, { rejectWithValue }) => {
    try {
      const tokens = JSON.parse(localStorage.getItem('tokens'));
      const response = await fetch(`/api/files/${fileId}/comment/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.access}`,
        },
        body: JSON.stringify({ comment }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка обновления комментария');
      }

      return await response.json();
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
      .addCase(deleteFile.fulfilled, (state, action) => {
        state.files = state.files.filter(f => f.id !== action.payload);
      })
      .addCase(deleteFile.rejected, (state, action) => {
        state.error = action.payload;
      })
      // uploadFile
      .addCase(uploadFile.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadFile.fulfilled, (state, action) => {
        state.files.push(action.payload);
        state.loading = false;
      })
      .addCase(uploadFile.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      // updateFileComment
      .addCase(updateFileComment.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateFileComment.fulfilled, (state, action) => {
        const index = state.files.findIndex(f => f.id === action.payload.id);
        if (index !== -1) {
          state.files[index] = action.payload;
        }
        state.loading = false;
      })
      .addCase(updateFileComment.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      });
  }
});

export default filesSlice.reducer;
