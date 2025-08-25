import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import filesReducer from './filesSlice';
import usersReducer from './usersSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    files: filesReducer,
    users: usersReducer,
  },
});
