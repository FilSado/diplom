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
  registerUser: jest.fn(() => ({ type: 'auth/registerUser', payload: {} }))
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
        onFinish({
          username: 'testuser',
          full_name: 'Test User',
          email: 'test@example.com',
          password: 'Password123!',
          passwordConfirm: 'Password123!'
        });
      }
    };

    return (
      <form onSubmit={handleSubmit} data-testid="register-form" {...props}>
        {children}
      </form>
    );
  };

  MockForm.Item = ({ label, children, name, rules, dependencies, ...props }) => (
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
        data-testid="register-button" 
        {...props}
      >
        {loading ? 'Загрузка...' : children}
      </button>
    ),
    Alert: ({ message, description, type, ...props }) => (
      <div data-testid="alert" className={`alert-${type}`} {...props}>
        <div data-testid="alert-message">{message}</div>
        {description && <div data-testid="alert-description">{description}</div>}
      </div>
    )
  };
});

// Импортируем компонент ПОСЛЕ всех моков
import RegisterPage from '../RegisterPage';
import { registerUser } from '../../store/authSlice';

describe('RegisterPage', () => {
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

  const renderPage = (state = {}) => {
    // Переопределяем состояние если передано
    if (Object.keys(state).length > 0) {
      mockUseSelector.mockImplementation((selector) => selector({ 
        auth: { ...defaultAuthState, ...state } 
      }));
    }

    return render(
      <Provider store={mockStore}>
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      </Provider>
    );
  };

  it('отображает форму регистрации', () => {
    renderPage();
    
    expect(screen.getByText('Регистрация')).toBeInTheDocument();
    expect(screen.getByLabelText('Логин')).toBeInTheDocument();
    expect(screen.getByLabelText('Полное имя')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Пароль')).toBeInTheDocument();
    expect(screen.getByLabelText('Подтвердите пароль')).toBeInTheDocument();
    expect(screen.getByTestId('register-button')).toBeInTheDocument();
  });

  it('вызывает registerUser на submit', () => {
    renderPage();

    const form = screen.getByTestId('register-form');
    fireEvent.submit(form);

    expect(mockDispatch).toHaveBeenCalled();
    expect(registerUser).toHaveBeenCalledWith({
      username: 'testuser',
      full_name: 'Test User',
      email: 'test@example.com',
      password: 'Password123!',
      password_confirm: 'Password123!'
    });
  });

  it('показывает ошибку при наличии error в состоянии', () => {
    renderPage({ error: 'Ошибка регистрации' });

    expect(screen.getByTestId('alert')).toBeInTheDocument();
    expect(screen.getByText('Ошибка регистрации')).toBeInTheDocument();
  });

  it('перенаправляет аутентифицированного пользователя', () => {
    renderPage({ 
      isAuthenticated: true,
      user: { username: 'testuser' },
      tokens: { access: 'token' }
    });

    expect(screen.getByTestId('navigate')).toBeInTheDocument();
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/storage');
  });

  it('показывает состояние загрузки', () => {
    renderPage({ loading: true });

    expect(screen.getByText('Загрузка...')).toBeInTheDocument();
  });

  it('не показывает форму для авторизованного пользователя', () => {
    renderPage({ 
      isAuthenticated: true,
      user: { username: 'testuser' }
    });

    // Форма не должна отображаться для авторизованного пользователя
    expect(screen.queryByText('Регистрация')).not.toBeInTheDocument();
    expect(screen.getByTestId('navigate')).toBeInTheDocument();
  });

  it('показывает ошибку объектного типа', () => {
    const errorObject = {
      username: ['Пользователь с таким именем уже существует'],
      email: ['Email уже зарегистрирован']
    };
    
    renderPage({ error: errorObject });

    expect(screen.getByTestId('alert')).toBeInTheDocument();
    expect(screen.getByText('Ошибка регистрации')).toBeInTheDocument();
  });

  it('disables register button when loading', () => {
    renderPage({ loading: true });

    const registerButton = screen.getByTestId('register-button');
    expect(registerButton).toBeDisabled();
  });

  it('renders all form fields with correct types', () => {
    renderPage();

    // Проверяем что все поля формы отрендерились
    expect(screen.getByTestId('form-item-username')).toBeInTheDocument();
    expect(screen.getByTestId('form-item-full_name')).toBeInTheDocument();
    expect(screen.getByTestId('form-item-email')).toBeInTheDocument();
    expect(screen.getByTestId('form-item-password')).toBeInTheDocument();
    expect(screen.getByTestId('form-item-passwordConfirm')).toBeInTheDocument();
  });
});

