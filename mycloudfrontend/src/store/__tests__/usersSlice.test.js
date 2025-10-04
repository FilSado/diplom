import { configureStore } from '@reduxjs/toolkit';
import usersReducer, { fetchUsers, deleteUser, toggleAdmin } from '../usersSlice';
import * as api from '../../utils/api';

jest.mock('../../utils/api');

describe('usersSlice thunks', () => {
  let store;

  beforeEach(() => {
    store = configureStore({ reducer: { users: usersReducer } });
    jest.clearAllMocks();
  });

  it('fetchUsers.fulfilled loads list', async () => {
    api.authorizedFetch.mockResolvedValue({ users: [{ id: 1 }] });
    await store.dispatch(fetchUsers());
    expect(store.getState().users.list).toEqual([{ id: 1 }]);
  });

  it('fetchUsers.rejected sets error', async () => {
    api.authorizedFetch.mockRejectedValue(new Error('fail'));
    await store.dispatch(fetchUsers());
    expect(store.getState().users.error).toBe('fail');
  });

  it('deleteUser.fulfilled removes user', async () => {
    store = configureStore({ 
      reducer: { users: usersReducer }, 
      preloadedState: { users: { list: [{ id: 1 }], loading: false, error: null } } 
    });
    api.authorizedFetch.mockResolvedValue({});
    await store.dispatch(deleteUser(1));
    expect(store.getState().users.list).toEqual([]);
  });

  it('toggleAdmin.fulfilled flips is_staff', async () => {
    store = configureStore({
      reducer: { users: usersReducer },
      preloadedState: { users: { list: [{ id: 1, is_staff: false }], loading: false, error: null } }
    });
    api.authorizedFetch.mockResolvedValue({ id: 1, is_staff: true });
    await store.dispatch(toggleAdmin({ id: 1, isStaff: true }));
    expect(store.getState().users.list[0].is_staff).toBe(true);
  });
});