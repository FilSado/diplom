import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { loginApi } from '../utils/api';

// Загрузка токенов из localStorage при старте приложения
const tokensFromStorage = JSON.parse(localStorage.getItem('tokens'));

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const data = await loginApi(credentials);
      return data;  // ожидается { access, refresh }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  tokens: tokensFromStorage || null,
  isAuthenticated: !!tokensFromStorage,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.tokens = null;
      state.isAuthenticated = false;
      state.error = null;
      state.loading = false;
      localStorage.removeItem('tokens');
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.tokens = action.payload;
        state.isAuthenticated = true;
        state.loading = false;
        localStorage.setItem('tokens', JSON.stringify(action.payload));
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
        state.isAuthenticated = false;
      });
  },
});

export const { logout } = authSlice.actions;

export default authSlice.reducer;
