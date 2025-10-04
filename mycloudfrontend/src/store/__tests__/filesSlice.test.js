import { configureStore } from '@reduxjs/toolkit';
import filesReducer, { fetchFiles, deleteFile, renameFile } from '../filesSlice';
import * as api from '../../utils/api';

jest.mock('../../utils/api');

describe('filesSlice thunks', () => {
  let store;

  beforeEach(() => {
    store = configureStore({ reducer: { files: filesReducer } });
    jest.clearAllMocks();
  });

  it('fetchFiles.fulfilled loads files', async () => {
    api.authorizedFetch.mockResolvedValue({ files: [{ id: 1 }] });
    await store.dispatch(fetchFiles());
    expect(store.getState().files.files).toEqual([{ id: 1 }]);
  });

  it('fetchFiles.rejected sets error', async () => {
    api.authorizedFetch.mockRejectedValue(new Error('fail'));
    await store.dispatch(fetchFiles());
    expect(store.getState().files.error).toBe('fail');
  });

  it('deleteFile.fulfilled removes file', async () => {
    store = configureStore({
      reducer: { files: filesReducer },
      preloadedState: { files: { files: [{ id: 1 }], loadingIds: [], error: null } }
    });
    api.authorizedFetch.mockResolvedValue({});
    await store.dispatch(deleteFile(1));
    expect(store.getState().files.files).toEqual([]);
  });

  it('deleteFile.rejected sets error', async () => {
    store = configureStore({
      reducer: { files: filesReducer },
      preloadedState: { files: { files: [{ id: 1 }], loadingIds: [], error: null } }
    });
    api.authorizedFetch.mockRejectedValue(new Error('fail'));
    await store.dispatch(deleteFile(1));
    expect(store.getState().files.error).toBe('fail');
  });

  it('renameFile.fulfilled updates name', async () => {
    store = configureStore({
      reducer: { files: filesReducer },
      preloadedState: { files: { files: [{ id: 1, original_name: 'a' }], loadingIds: [], error: null } }
    });
    api.renameFileApi.mockResolvedValue({ original_name: 'b' });
    await store.dispatch(renameFile({ fileId: 1, newName: 'b' }));
    expect(store.getState().files.files[0].original_name).toBe('b');
  });

  it('renameFile.rejected sets error', async () => {
    store = configureStore({
      reducer: { files: filesReducer },
      preloadedState: { files: { files: [{ id: 1, original_name: 'a' }], loadingIds: [], error: null } }
    });
    api.renameFileApi.mockRejectedValue(new Error('fail'));
    await store.dispatch(renameFile({ fileId: 1, newName: 'b' }));
    expect(store.getState().files.error).toBe('fail');
  });
});
