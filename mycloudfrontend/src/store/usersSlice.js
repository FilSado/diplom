import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authorizedFetch } from '../utils/api';

// Получить список пользователей
export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (_, { rejectWithValue }) => {
    try {
      const data = await authorizedFetch('/admin/users/');
      return Array.isArray(data) ? data : data.users || [];
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
      await authorizedFetch(`/admin/users/${userId}/delete/`, { method: 'DELETE' });
      return userId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Переключить права администратора
export const toggleAdmin = createAsyncThunk(
  'users/toggleAdmin',
  async ({ id, isStaff }, { rejectWithValue }) => {
    try {
      const updated = await authorizedFetch(`/admin/users/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_staff: isStaff }),
      });
      return { id, isStaff: updated.is_staff };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const usersSlice = createSlice({
  name: 'users',
  initialState: { list: [], loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.list = action.payload;
        state.loading = false;
      })
      .addCase(fetchUsers.rejected, (state, action) => { state.error = action.payload; state.loading = false; })

      .addCase(deleteUser.fulfilled, (state, action) => {
        state.list = state.list.filter((u) => u.id !== action.payload);
      })

      .addCase(toggleAdmin.fulfilled, (state, action) => {
        const user = state.list.find((u) => u.id === action.payload.id);
        if (user) user.is_staff = action.payload.isStaff;
      });
  },
});

export default usersSlice.reducer;
