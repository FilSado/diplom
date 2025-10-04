import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Navbar from '../../components/Navbar';
import authReducer from '../../store/authSlice';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const orig = jest.requireActual('react-router-dom');
  return {
    ...orig,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/' }),
    MemoryRouter: orig.MemoryRouter,
  };
});

// Мокаем Ant Design Modal.useModal для автоматического подтверждения
import { Modal } from 'antd';
Modal.useModal = () => [{
  confirm: ({ onOk }) => onOk()
}, <div key="modal-placeholder" />];

describe('Navbar', () => {
  const createStore = authState => configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { isAuthenticated: false, user: null, ...authState } }
  });

  const renderNav = authState => {
    const store = createStore(authState);
    return render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[authState.initialPath || '/']}>
          <Navbar />
        </MemoryRouter>
      </Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logout workflow', async () => {
    renderNav({ isAuthenticated: true, user: { id: 1, username: 'u', role: 'user' } });

    // Открываем меню пользователя
    fireEvent.click(screen.getByText('u'));

    // Ждем появления кнопки "Выйти"
    await waitFor(() => expect(screen.getByText('Выйти')).toBeInTheDocument());

    // Кликаем кнопку "Выйти"
    fireEvent.click(screen.getByText('Выйти'));

    // Проверяем вызов navigate('/login')
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login'));
  });
});
