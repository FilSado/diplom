import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { 
  loginApi, 
  getCurrentUserApi, 
  refreshTokenApi,
  logoutApi,
  registerApi 
} from '../utils/api';

// Загрузка данных из localStorage при старте приложения
const tokensFromStorage = (() => {
  try {
    return JSON.parse(localStorage.getItem('tokens'));
  } catch (e) {
    return null;
  }
})();

const userFromStorage = (() => {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch (e) {
    return null;
  }
})();

// =================
// ASYNC THUNKS
// =================

// Вход в систему
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const data = await loginApi(credentials);
      
      // API теперь возвращает { access, refresh, user } благодаря CustomTokenObtainPairSerializer
      if (data.access && data.refresh) {
        return {
          tokens: {
            access: data.access,
            refresh: data.refresh
          },
          user: data.user || {
            id: 1,
            username: credentials.username,
            email: credentials.email || '',
            full_name: credentials.username,
            role: 'user',
            avatar: null,
            is_staff: false,
            is_superuser: false
          }
        };
      }
      
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Ошибка входа в систему');
    }
  }
);

// Регистрация пользователя
export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData, { rejectWithValue }) => {
    try {
      const data = await registerApi(userData);
      
      // Если регистрация прошла успешно и вернулись токены
      if (data.tokens) {
        return {
          tokens: data.tokens,
          user: data.user || {
            id: data.id,
            username: userData.username,
            email: userData.email,
            full_name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username,
            role: 'user',
            avatar: null,
            is_staff: false,
            is_superuser: false
          }
        };
      }
      
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Ошибка регистрации');
    }
  }
);

// Получение данных текущего пользователя
export const fetchUserProfile = createAsyncThunk(
  'auth/fetchUserProfile',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      
      // Если пользователь уже есть в состоянии, возвращаем его
      if (auth.user && !auth.loading) {
        return auth.user;
      }
      
      const token = auth.tokens?.access;
      if (!token) {
        throw new Error('Токен доступа отсутствует');
      }

      // Используем реальный API вызов
      const userData = await getCurrentUserApi();
      return userData;
    } catch (error) {
      return rejectWithValue(error.message || 'Ошибка получения данных пользователя');
    }
  }
);

// Обновление токена
export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const currentRefreshToken = auth.tokens?.refresh;
      
      if (!currentRefreshToken) {
        throw new Error('Refresh токен отсутствует');
      }

      // Используем функцию из api.js
      const newTokens = await refreshTokenApi();
      return newTokens;
    } catch (error) {
      return rejectWithValue(error.message || 'Ошибка обновления токена');
    }
  }
);

// Выход из системы
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await logoutApi();
      return true;
    } catch (error) {
      // Даже если запрос на сервер не прошел, очищаем локальные данные
      console.warn('Ошибка при logout на сервере:', error);
      return true;
    }
  }
);

// Проверка статуса аутентификации
export const checkAuthStatus = createAsyncThunk(
  'auth/checkAuthStatus',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const { auth } = getState();
      
      // Если нет токенов, пользователь не авторизован
      if (!auth.tokens?.access) {
        return { isAuthenticated: false };
      }

      // Проверяем истечение токена
      if (auth.tokenExpiry && Date.now() >= auth.tokenExpiry - 60000) { // Обновляем за минуту до истечения
        try {
          await dispatch(refreshToken()).unwrap();
        } catch (error) {
          // Если не удалось обновить токен, пользователь не авторизован
          return { isAuthenticated: false };
        }
      }

      // Получаем данные пользователя если их нет
      if (!auth.user) {
        const userData = await dispatch(fetchUserProfile()).unwrap();
        return { 
          isAuthenticated: true, 
          user: userData 
        };
      }

      return { 
        isAuthenticated: true, 
        user: auth.user 
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Ошибка проверки статуса авторизации');
    }
  }
);

// =================
// INITIAL STATE
// =================

const initialState = {
  tokens: tokensFromStorage || null,
  user: userFromStorage || null,
  isAuthenticated: !!(tokensFromStorage?.access && userFromStorage),
  isInitialized: false,
  loading: false,
  error: null,
  tokenExpiry: null,
  lastActivity: Date.now(),
};

// =================
// SLICE
// =================

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Ручной выход из системы
    logout(state) {
      state.tokens = null;
      state.user = null;
      state.isAuthenticated = false;
      state.isInitialized = true;
      state.error = null;
      state.loading = false;
      state.tokenExpiry = null;
      state.lastActivity = Date.now();
      
      // Очищаем localStorage
      localStorage.removeItem('tokens');
      localStorage.removeItem('user');
    },

    // Очистка ошибок
    clearError(state) {
      state.error = null;
    },

    // Установка состояния инициализации
    setInitialized(state) {
      state.isInitialized = true;
    },

    // Обновление данных пользователя
    updateUser(state, action) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },

    // Установка времени истечения токена
    setTokenExpiry(state, action) {
      state.tokenExpiry = action.payload;
    },

    // Обновление последней активности
    updateLastActivity(state) {
      state.lastActivity = Date.now();
    },

    // Сброс состояния загрузки
    resetLoading(state) {
      state.loading = false;
    }
  },

  extraReducers: (builder) => {
    builder
      // =================
      // LOGIN USER
      // =================
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.tokens = action.payload.tokens;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.isInitialized = true;
        state.loading = false;
        state.error = null;
        state.lastActivity = Date.now();
        
        // Сохраняем в localStorage
        localStorage.setItem('tokens', JSON.stringify(action.payload.tokens));
        localStorage.setItem('user', JSON.stringify(action.payload.user));
        
        // Устанавливаем время истечения токена
        if (action.payload.tokens.access) {
          try {
            const tokenPayload = JSON.parse(atob(action.payload.tokens.access.split('.')[1]));
            state.tokenExpiry = tokenPayload.exp * 1000; // Переводим в миллисекунды
          } catch (error) {
            console.warn('Не удалось получить время истечения токена:', error);
          }
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
        state.isAuthenticated = false;
        state.isInitialized = true;
        state.tokens = null;
        state.user = null;
      })

      // =================
      // REGISTER USER
      // =================
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        if (action.payload.tokens) {
          // Если регистрация включает автоматический вход
          state.tokens = action.payload.tokens;
          state.user = action.payload.user;
          state.isAuthenticated = true;
          state.lastActivity = Date.now();
          
          localStorage.setItem('tokens', JSON.stringify(action.payload.tokens));
          localStorage.setItem('user', JSON.stringify(action.payload.user));
        }
        state.isInitialized = true;
        state.loading = false;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
        state.isInitialized = true;
      })

      // =================
      // FETCH USER PROFILE
      // =================
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
        state.isInitialized = true;
        state.isAuthenticated = true;
        state.lastActivity = Date.now();
        localStorage.setItem('user', JSON.stringify(action.payload));
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
        state.isInitialized = true;
        
        // Если ошибка 401, возможно токен истек
        if (action.payload?.includes('401') || action.payload?.includes('Unauthorized')) {
          state.tokens = null;
          state.user = null;
          state.isAuthenticated = false;
          localStorage.removeItem('tokens');
          localStorage.removeItem('user');
        }
      })

      // =================
      // REFRESH TOKEN
      // =================
      .addCase(refreshToken.pending, (state) => {
        // Не показываем loading при обновлении токена в фоне
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.tokens = action.payload;
        localStorage.setItem('tokens', JSON.stringify(action.payload));
        
        // Обновляем время истечения
        try {
          const tokenPayload = JSON.parse(atob(action.payload.access.split('.')[1]));
          state.tokenExpiry = tokenPayload.exp * 1000;
        } catch (error) {
          console.warn('Не удалось получить время истечения токена:', error);
        }
        
        state.lastActivity = Date.now();
      })
      .addCase(refreshToken.rejected, (state, action) => {
        // При ошибке обновления токена - выходим из системы
        state.tokens = null;
        state.user = null;
        state.isAuthenticated = false;
        state.error = 'Сессия истекла, войдите заново';
        localStorage.removeItem('tokens');
        localStorage.removeItem('user');
      })

      // =================
      // LOGOUT USER
      // =================
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.tokens = null;
        state.user = null;
        state.isAuthenticated = false;
        state.isInitialized = true;
        state.loading = false;
        state.error = null;
        state.tokenExpiry = null;
        state.lastActivity = Date.now();
        
        localStorage.removeItem('tokens');
        localStorage.removeItem('user');
      })
      .addCase(logoutUser.rejected, (state) => {
        // Даже при ошибке очищаем состояние
        state.tokens = null;
        state.user = null;
        state.isAuthenticated = false;
        state.isInitialized = true;
        state.loading = false;
        state.tokenExpiry = null;
        
        localStorage.removeItem('tokens');
        localStorage.removeItem('user');
      })

      // =================
      // CHECK AUTH STATUS
      // =================
      .addCase(checkAuthStatus.pending, (state) => {
        // Не показываем loading при проверке статуса в фоне
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.isAuthenticated = action.payload.isAuthenticated;
        state.isInitialized = true;
        
        if (action.payload.user) {
          state.user = action.payload.user;
          localStorage.setItem('user', JSON.stringify(action.payload.user));
        }
        
        if (!action.payload.isAuthenticated) {
          state.tokens = null;
          state.user = null;
          localStorage.removeItem('tokens');
          localStorage.removeItem('user');
        }
        
        state.lastActivity = Date.now();
      })
      .addCase(checkAuthStatus.rejected, (state, action) => {
        state.isAuthenticated = false;
        state.isInitialized = true;
        state.tokens = null;
        state.user = null;
        state.error = action.payload;
        
        localStorage.removeItem('tokens');
        localStorage.removeItem('user');
      });
  },
});

// =================
// SELECTORS
// =================

export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectIsLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectIsInitialized = (state) => state.auth.isInitialized;

export const selectIsAdmin = (state) => {
  const user = state.auth.user;
  return user?.role === 'admin' || user?.is_staff || user?.is_superuser;
};

export const selectUserRole = (state) => {
  const user = state.auth.user;
  if (user?.is_superuser) return 'superuser';
  if (user?.is_staff || user?.role === 'admin') return 'admin';
  return 'user';
};

export const selectTokenExpiry = (state) => state.auth.tokenExpiry;
export const selectLastActivity = (state) => state.auth.lastActivity;

// =================
// ACTIONS EXPORT
// =================

export const { 
  logout, 
  clearError, 
  setInitialized, 
  updateUser, 
  setTokenExpiry,
  updateLastActivity,
  resetLoading
} = authSlice.actions;

export default authSlice.reducer;
