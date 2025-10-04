import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';

// Мокаем react-redux с полным контролем
const mockDispatch = jest.fn();
const mockUseSelector = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
  useSelector: (selector) => mockUseSelector(selector),
  Provider: ({ children }) => <div data-testid="provider">{children}</div>
}));

// Мокаем authSlice
jest.mock('../../store/authSlice', () => ({
  loginUser: jest.fn(() => ({ type: 'auth/loginUser', payload: {} }))
}));

// Мокаем react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Navigate: ({ to }) => <div data-testid="navigate" data-to={to}>Navigate to {to}</div>,
  MemoryRouter: ({ children }) => <div data-testid="memory-router">{children}</div>
}));

// Мокаем Ant Design
jest.mock('antd', () => {
  const React = require('react');
  
  const MockInput = React.forwardRef((props, ref) => (
    <input ref={ref} data-testid={`input-${props.name || 'default'}`} {...props} />
  ));

  const MockPasswordInput = React.forwardRef((props, ref) => (
    <input type="password" ref={ref} data-testid={`password-input-${props.name || 'default'}`} {...props} />
  ));

  const MockForm = ({ children, onFinish, ...props }) => {
    const handleSubmit = (e) => {
      e.preventDefault();
      if (onFinish) {
        onFinish({ username: 'testuser', password: 'testpass' });
      }
    };

    return (
      <form onSubmit={handleSubmit} data-testid="login-form" {...props}>
        {children}
      </form>
    );
  };

  MockForm.Item = ({ label, children, name, rules, ...props }) => (
    <div data-testid={`form-item-${name}`} {...props}>
      {label && <label htmlFor={name}>{label}</label>}
      {React.cloneElement(children, { id: name, name })}
    </div>
  );

  MockInput.Password = MockPasswordInput;

  return {
    Form: MockForm,
    Input: MockInput,
    Button: ({ children, loading, htmlType, ...props }) => (
      <button 
        type={htmlType || 'button'} 
        disabled={loading} 
        data-testid="login-button" 
        {...props}
      >
        {loading ? 'Загрузка...' : children}
      </button>
    ),
    Alert: ({ message, type, ...props }) => (
      <div data-testid="alert" className={`alert-${type}`} {...props}>
        {message}
      </div>
    )
  };
});

// Импортируем компонент и функции ПОСЛЕ всех моков
import LoginPage from '../LoginPage';
import { loginUser } from '../../store/authSlice';

describe('LoginPage', () => {
  const mockStore = configureStore({
    reducer: {
      auth: (state = { isAuthenticated: false, loading: false, error: null }) => state
    }
  });

  // Дефолтное состояние для useSelector
  const defaultAuthState = {
    isAuthenticated: false,
    loading: false,
    error: null,
    user: null,
    tokens: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockClear();
    // Устанавливаем дефолтное состояние
    mockUseSelector.mockImplementation((selector) => selector({ auth: defaultAuthState }));
  });

  it('отображает форму входа', () => {
    render(
      <Provider store={mockStore}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </Provider>
    );
    
    expect(screen.getByText('Вход в систему')).toBeInTheDocument();
    expect(screen.getByLabelText('Логин')).toBeInTheDocument();
    expect(screen.getByLabelText('Пароль')).toBeInTheDocument();
    expect(screen.getByTestId('login-button')).toBeInTheDocument();
  });

  it('вызывает loginUser при отправке формы', () => {
    render(
      <Provider store={mockStore}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </Provider>
    );

    const form = screen.getByTestId('login-form');
    fireEvent.submit(form);

    expect(mockDispatch).toHaveBeenCalled();
    expect(loginUser).toHaveBeenCalledWith({
      username: 'testuser',
      password: 'testpass'
    });
  });

  it('показывает ошибку', () => {
    // Переопределяем состояние для этого теста
    mockUseSelector.mockImplementation((selector) => selector({
      auth: { ...defaultAuthState, error: 'Неверные данные' }
    }));

    render(
      <Provider store={mockStore}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText('Неверные данные')).toBeInTheDocument();
    expect(screen.getByTestId('alert')).toBeInTheDocument();
  });

  it('перенаправляет аутентифицированного пользователя', () => {
    mockUseSelector.mockImplementation((selector) => selector({
      auth: {
        ...defaultAuthState,
        isAuthenticated: true,
        user: { username: 'testuser' },
        tokens: { access: 'token' }
      }
    }));

    render(
      <Provider store={mockStore}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByTestId('navigate')).toBeInTheDocument();
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/storage');
  });

  it('показывает состояние загрузки', () => {
    mockUseSelector.mockImplementation((selector) => selector({
      auth: { ...defaultAuthState, loading: true }
    }));

    render(
      <Provider store={mockStore}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText('Загрузка...')).toBeInTheDocument();
  });

  it('не показывает форму для авторизованного пользователя', () => {
    mockUseSelector.mockImplementation((selector) => selector({
      auth: {
        ...defaultAuthState,
        isAuthenticated: true,
        user: { username: 'testuser' }
      }
    }));

    render(
      <Provider store={mockStore}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </Provider>
    );

    expect(screen.queryByText('Вход в систему')).not.toBeInTheDocument();
    expect(screen.getByTestId('navigate')).toBeInTheDocument();
  });
});
