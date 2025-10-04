import { configureStore } from '@reduxjs/toolkit';
import authReducer, { loginUser, registerUser, fetchUserProfile } from '../authSlice';
import * as api from '../../utils/api';

jest.mock('../../utils/api');

describe('authSlice thunks', () => {
  let store;

  beforeEach(() => {
    store = configureStore({ reducer: { auth: authReducer } });
    jest.clearAllMocks();
  });

  it('loginUser.fulfilled sets tokens and user', async () => {
    api.loginApi.mockResolvedValue({ access: 'a', refresh: 'r', user: { id: 1, username: 'u' } });
    await store.dispatch(loginUser({ username: 'u', password: 'p' }));
    const state = store.getState().auth;
    expect(state.isAuthenticated).toBe(true);
    expect(state.tokens).toEqual({ access: 'a', refresh: 'r' });
    expect(state.user.username).toBe('u');
  });

  it('loginUser.rejected sets error', async () => {
    api.loginApi.mockRejectedValue(new Error('fail'));
    await store.dispatch(loginUser({ username: 'u', password: 'p' }));
    expect(store.getState().auth.error).toBe('fail');
  });

  it('registerUser.fulfilled sets tokens and user', async () => {
    api.registerApi.mockResolvedValue({ tokens: { access: 'x', refresh: 'y' }, user: { id: 2, username: 'v' } });
    await store.dispatch(registerUser({ username: 'v', password: 'q' }));
    const state = store.getState().auth;
    expect(state.isAuthenticated).toBe(true);
    expect(state.user.id).toBe(2);
  });

  it('registerUser.rejected sets error', async () => {
    api.registerApi.mockRejectedValue(new Error('fail'));
    await store.dispatch(registerUser({ username: 'v', password: 'q' }));
    expect(store.getState().auth.error).toBe('fail');
  });

  it('fetchUserProfile.fulfilled sets user', async () => {
    // Создаем store с токенами, чтобы избежать "Токен доступа отсутствует"
    store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: { auth: { tokens: { access: 'token' } } }
    });
    
    api.getCurrentUserApi.mockResolvedValue({ id: 3, username: 'profileUser' });
    await store.dispatch(fetchUserProfile());
    const state = store.getState().auth;
    expect(state.user.username).toBe('profileUser');
    expect(state.isAuthenticated).toBe(true);
  });

  it('fetchUserProfile.rejected sets error', async () => {
    store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: { auth: { tokens: { access: 'token' } } }
    });
    
    api.getCurrentUserApi.mockRejectedValue(new Error('fail'));
    await store.dispatch(fetchUserProfile());
    expect(store.getState().auth.error).toBe('fail');
  });
});