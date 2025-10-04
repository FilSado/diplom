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

// Мокаем usersSlice
jest.mock('../../store/usersSlice', () => ({
  fetchUsers: jest.fn(() => ({ type: 'users/fetchUsers', payload: {} })),
  deleteUser: jest.fn(() => ({ type: 'users/deleteUser', payload: {} })),
  toggleAdmin: jest.fn(() => ({ type: 'users/toggleAdmin', payload: {} }))
}));

// Мокаем react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  MemoryRouter: ({ children }) => <div data-testid="memory-router">{children}</div>
}));

// Мокаем @ant-design/icons
jest.mock('@ant-design/icons', () => ({
  DeleteOutlined: () => <span data-testid="delete-icon">🗑️</span>,
  FileTextOutlined: () => <span data-testid="file-icon">📄</span>
}));

// Мокаем Ant Design
jest.mock('antd', () => {
  const React = require('react');
  
  return {
    Card: ({ children, ...props }) => (
      <div data-testid="card" {...props}>{children}</div>
    ),
    Typography: {
      Title: ({ children, level, style, ...props }) => {
        const Tag = `h${level || 1}`;
        return <Tag style={style} {...props}>{children}</Tag>;
      }
    },
    Table: ({ dataSource = [], columns = [], rowKey, pagination, ...props }) => (
      <div data-testid="table" {...props}>
        <div data-testid="table-header">
          {columns.map((col, index) => (
            <span key={index} data-testid={`column-${col.key}`}>
              {col.title}
            </span>
          ))}
        </div>
        <div data-testid="table-body">
          {dataSource.map((item) => (
            <div key={item[rowKey] || item.id} data-testid={`row-${item.id}`}>
              {columns.map((col, index) => (
                <span key={index} data-testid={`cell-${item.id}-${col.key}`}>
                  {col.render ? col.render(item[col.dataIndex], item, index) : item[col.dataIndex]}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    Switch: ({ checked, disabled, onChange, checkedChildren, unCheckedChildren, ...props }) => (
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange && onChange(!checked)}
        data-testid="admin-switch"
        {...props}
      >
        {checked ? checkedChildren : unCheckedChildren}
      </button>
    ),
    Button: ({ children, onClick, disabled, icon, title, danger, type, ...props }) => (
      <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        data-testid="button"
        data-type={type}
        data-danger={danger}
        {...props}
      >
        {icon}
        {children}
      </button>
    ),
    Space: ({ children, ...props }) => (
      <div data-testid="space" {...props}>{children}</div>
    ),
    Alert: ({ message, description, type, showIcon, ...props }) => (
      <div data-testid={`alert-${type || 'default'}`} className={`alert-${type}`} {...props}>
        <div data-testid="alert-message">{message}</div>
        {description && <div data-testid="alert-description">{description}</div>}
      </div>
    ),
    Spin: ({ tip, size, ...props }) => (
      <div data-testid="spin" data-size={size} {...props}>
        <div data-testid="spin-tip">{tip}</div>
      </div>
    )
  };
});

// Импортируем компонент ПОСЛЕ всех моков
import AdminPage from '../AdminPage';
import { fetchUsers, deleteUser, toggleAdmin } from '../../store/usersSlice';

// Мокаем глобальные функции
global.confirm = jest.fn();

describe('AdminPage', () => {
  const mockStore = configureStore({
    reducer: {
      users: (state = { list: [], loading: false, error: null }) => state,
      auth: (state = { user: null }) => state
    }
  });

  // Дефолтное состояние для useSelector
  const defaultState = {
    users: { list: [], loading: false, error: null },
    auth: { user: null }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockClear();
    global.confirm.mockClear();
    // Устанавливаем дефолтное состояние
    mockUseSelector.mockImplementation((selector) => selector(defaultState));
  });

  const renderWithState = (state = {}) => {
    // Переопределяем состояние если передано
    if (Object.keys(state).length > 0) {
      mockUseSelector.mockImplementation((selector) => selector({ 
        ...defaultState, 
        ...state 
      }));
    }

    return render(
      <Provider store={mockStore}>
        <MemoryRouter>
          <AdminPage />
        </MemoryRouter>
      </Provider>
    );
  };

  it('renders header and table', () => {
    renderWithState({ 
      users: { list: [{ id: 1, username: 'user1' }], loading: false, error: null }, 
      auth: { user: null } 
    });
    
    expect(screen.getByText('Административная панель')).toBeInTheDocument();
    expect(screen.getByTestId('table')).toBeInTheDocument();
    expect(screen.getByText('user1')).toBeInTheDocument();
  });

  it('renders loading spinner', () => {
    renderWithState({ 
      users: { loading: true, list: [], error: null },
      auth: { user: null }
    });
    
    expect(screen.getByTestId('spin')).toBeInTheDocument();
    expect(screen.getByText('Загрузка пользователей...')).toBeInTheDocument();
  });

  it('renders error alert', () => {
    renderWithState({ 
      users: { loading: false, list: [], error: 'Произошла ошибка' },
      auth: { user: null }
    });
    
    expect(screen.getByTestId('alert-error')).toBeInTheDocument();
    expect(screen.getByText('Ошибка загрузки')).toBeInTheDocument();
    expect(screen.getByText('Произошла ошибка')).toBeInTheDocument();
  });

  it('handles delete user', async () => {
    global.confirm.mockReturnValue(true);
    
    renderWithState({ 
      users: { list: [{ id: 5, username: 'user5', is_staff: false }], loading: false, error: null },
      auth: { user: null }
    });
    
    const deleteButton = screen.getAllByTestId('button').find(btn => 
      btn.getAttribute('data-danger') === 'true'
    );
    
    fireEvent.click(deleteButton);
    
    expect(global.confirm).toHaveBeenCalledWith('Вы уверены, что хотите удалить этого пользователя?');
    expect(mockDispatch).toHaveBeenCalled();
    expect(deleteUser).toHaveBeenCalledWith(5);
  });

  it('handles toggle admin', async () => {
    renderWithState({ 
      users: { list: [{ id: 3, username: 'user3', is_staff: false }], loading: false, error: null },
      auth: { user: null }
    });
    
    const switchElement = screen.getByTestId('admin-switch');
    fireEvent.click(switchElement);
    
    expect(mockDispatch).toHaveBeenCalled();
    expect(toggleAdmin).toHaveBeenCalledWith({ id: 3, isStaff: true });
  });

  it('fetches users on component mount', () => {
    renderWithState();
    
    // Проверяем что fetchUsers был вызван при монтировании
    expect(mockDispatch).toHaveBeenCalled();
    expect(fetchUsers).toHaveBeenCalled();
  });

  it('renders empty state when no users', () => {
    renderWithState({
      users: { list: [], loading: false, error: null },
      auth: { user: null }
    });
    
    expect(screen.getByText('Пользователи не найдены')).toBeInTheDocument();
    expect(screen.getByText('В системе пока нет зарегистрированных пользователей.')).toBeInTheDocument();
  });

  it('disables admin toggle for current user', () => {
    const currentUser = { id: 1, username: 'admin' };
    
    renderWithState({
      users: { 
        list: [{ id: 1, username: 'admin', is_staff: true }], 
        loading: false, 
        error: null 
      },
      auth: { user: currentUser }
    });
    
    const switchElement = screen.getByTestId('admin-switch');
    expect(switchElement).toBeDisabled();
  });

  it('disables delete button for current user', () => {
    const currentUser = { id: 1, username: 'admin' };
    
    renderWithState({
      users: { 
        list: [{ id: 1, username: 'admin', is_staff: true }], 
        loading: false, 
        error: null 
      },
      auth: { user: currentUser }
    });
    
    const deleteButton = screen.getAllByTestId('button').find(btn => 
      btn.getAttribute('data-danger') === 'true'
    );
    
    expect(deleteButton).toBeDisabled();
  });

  it('shows user count when users exist', () => {
    renderWithState({
      users: { 
        list: [
          { id: 10, username: 'user10', is_staff: false },
          { id: 20, username: 'user20', is_staff: true }
        ], 
        loading: false, 
        error: null 
      },
      auth: { user: null }
    });
    
    expect(screen.getByText('Всего пользователей:')).toBeInTheDocument();
    // Используем более специфичный селектор для избежания коллизий
    expect(screen.getByText('Всего пользователей:').parentElement).toHaveTextContent('2');
  });

  it('does not cancel delete when user clicks cancel', () => {
    global.confirm.mockReturnValue(false);
    
    renderWithState({ 
      users: { list: [{ id: 6, username: 'user6', is_staff: false }], loading: false, error: null },
      auth: { user: null }
    });
    
    const deleteButton = screen.getAllByTestId('button').find(btn => 
      btn.getAttribute('data-danger') === 'true'
    );
    
    fireEvent.click(deleteButton);
    
    expect(global.confirm).toHaveBeenCalled();
    // deleteUser НЕ должен быть вызван, так как пользователь отменил
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('renders table columns correctly', () => {
    renderWithState({ 
      users: { list: [{ id: 1, username: 'testuser', full_name: 'Test User', email: 'test@example.com', is_staff: false }], loading: false, error: null }, 
      auth: { user: null } 
    });
    
    expect(screen.getByTestId('column-id')).toHaveTextContent('ID');
    expect(screen.getByTestId('column-username')).toHaveTextContent('Логин');
    expect(screen.getByTestId('column-full_name')).toHaveTextContent('Полное имя');
    expect(screen.getByTestId('column-email')).toHaveTextContent('Email');
    expect(screen.getByTestId('column-actions')).toHaveTextContent('Действия');
  });

  it('renders user data in table cells', () => {
    renderWithState({ 
      users: { list: [{ id: 7, username: 'testuser7', full_name: 'Test User Seven', email: 'test7@example.com', is_staff: true }], loading: false, error: null }, 
      auth: { user: null } 
    });
    
    expect(screen.getByTestId('cell-7-id')).toHaveTextContent('7');
    expect(screen.getByTestId('cell-7-username')).toHaveTextContent('testuser7');
    expect(screen.getByTestId('cell-7-full_name')).toHaveTextContent('Test User Seven');
    expect(screen.getByTestId('cell-7-email')).toHaveTextContent('test7@example.com');
  });
});
