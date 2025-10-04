import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import FileItem from '../../components/FileItem';
import authReducer from '../../store/authSlice';

// Мокаем utils/auth
jest.mock('../../utils/auth', () => ({
  hasAccess: jest.fn()
}));

// Мокаем Ant Design message
jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  return {
    ...actual,
    message: {
      success: jest.fn(),
      error: jest.fn(),
    },
  };
});

describe('FileItem Component', () => {
  let store;
  const { hasAccess } = require('../../utils/auth');

  const mockFile = {
    id: 1,
    original_name: 'test-document.pdf',
    size: 1048576, // 1MB
    comment: 'Test file comment',
    user_id: 1,
    last_download: '2025-01-01T10:00:00Z',
    public_url: 'https://example.com/files/public/abc123'
  };

  const mockHandlers = {
    onDelete: jest.fn(),
    onDownload: jest.fn(),
    onCopyLink: jest.fn(),
    onUpdateComment: jest.fn().mockResolvedValue(),
    onRename: jest.fn().mockResolvedValue(),
  };

  const createMockStore = (user = { id: 1, role: 'user' }) => configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user,
        isAuthenticated: true,
        tokens: { access: 'mock-token' }
      }
    }
  });

  const renderComponent = (props = {}, user) => {
    store = createMockStore(user);
    return render(
      <Provider store={store}>
        <table><tbody>
          <FileItem 
            file={mockFile}
            loading={false}
            {...mockHandlers}
            {...props}
          />
        </tbody></table>
      </Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    hasAccess.mockReturnValue(false);
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue() }
    });
  });

  it('displays file name and formatted size', () => {
    renderComponent({}, { id: 1, role: 'user' });
    expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
    expect(screen.getByText('1.00 MB')).toBeInTheDocument();
  });

  it('formats and displays date', () => {
    renderComponent();
    expect(screen.getByText(/янв/i)).toBeInTheDocument();
  });

  it('handles missing date', () => {
    renderComponent({ file: { ...mockFile, last_download: null } });
    expect(screen.getByText('Дата отсутствует')).toBeInTheDocument();
  });

  it('renders edit button for owner', () => {
    hasAccess.mockReturnValue(false);
    renderComponent({}, { id:1, role:'user' });
    expect(screen.getByText('Редактировать')).toBeInTheDocument();
  });

  it('does not render edit for other users', () => {
    renderComponent({}, { id:2, role:'user' });
    expect(screen.queryByText('Редактировать')).not.toBeInTheDocument();
  });

  it('allows comment editing and saving', async () => {
    renderComponent({}, { id:1, role:'user' });
    fireEvent.click(screen.getByText('Редактировать'));
    const textarea = screen.getByDisplayValue('Test file comment');
    fireEvent.change(textarea, { target: { value: 'Updated comment' } });
    fireEvent.click(screen.getByText('Сохранить'));
    await waitFor(() =>
      expect(mockHandlers.onUpdateComment).toHaveBeenCalledWith(1, 'Updated comment')
    );
  });

  it('copies public link', async () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /копировать ссылку/i }));
    await waitFor(() => 
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockFile.public_url)
    );
    expect(require('antd').message.success).toHaveBeenCalledWith('Ссылка скопирована');
  });

  it('handles download click', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /скачать файл/i }));
    expect(mockHandlers.onDownload).toHaveBeenCalledWith(mockFile);
  });

  it('shows rename modal and performs rename', async () => {
    renderComponent({}, { id:1, role:'user' });
    fireEvent.click(screen.getByRole('button', { name: /переименовать/i }));
    const input = screen.getByDisplayValue('test-document.pdf');
    fireEvent.change(input, { target: { value: 'new.pdf' } });
    fireEvent.click(screen.getByText('Сохранить'));
    await waitFor(() =>
      expect(mockHandlers.onRename).toHaveBeenCalledWith(1, 'new.pdf')
    );
  });

  it('handles delete confirm', async () => {
    renderComponent({}, { id:1, role:'user' });
    fireEvent.click(screen.getByRole('button', { name: /удалить файл/i }));
    fireEvent.click(screen.getByText('Да'));
    await waitFor(() =>
      expect(mockHandlers.onDelete).toHaveBeenCalledWith(1)
    );
  });

  it('shows all actions for admin', () => {
    hasAccess.mockReturnValue(true);
    renderComponent({}, { id:2, role:'admin' });
    expect(screen.getByText('Редактировать')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /удалить файл/i })).toBeInTheDocument();
  });
});
