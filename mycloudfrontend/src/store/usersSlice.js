import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authorizedFetch } from '../utils/api';

// Получить список пользователей
export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (_, { rejectWithValue }) => {
    try {
      const data = await authorizedFetch('/users/');
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Удалить пользователя
export const deleteUser = createAsyncThunk(
  'users/deleteUser',
  async (userId, { rejectWithValue }) => {
    try {
      await authorizedFetch(`/users/${userId}/`, { method: 'DELETE' });
      return userId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Переключить признак администратора
export const toggleAdmin = createAsyncThunk(
  'users/toggleAdmin',
  async ({ id, isAdmin }, { rejectWithValue }) => {
    try {
      const response = await authorizedFetch(`/users/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ is_admin: isAdmin }),
      });
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const usersSlice = createSlice({
  name: 'users',
  initialState: {
    users: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.users = action.payload;
        state.loading = false;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.users = state.users.filter(u => u.id !== action.payload);
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(toggleAdmin.fulfilled, (state, action) => {
        const index = state.users.findIndex(u => u.id === action.payload.id);
        if (index !== -1) state.users[index].is_admin = action.payload.is_admin;
      })
      .addCase(toggleAdmin.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export default usersSlice.reducer;
