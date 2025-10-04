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

// Мокаем filesSlice
jest.mock('../../store/filesSlice', () => ({
  fetchFiles: jest.fn(() => ({ type: 'files/fetchFiles', payload: {} })),
  deleteFile: jest.fn(() => ({ type: 'files/deleteFile', payload: {} })),
  updateFileComment: jest.fn(() => ({ type: 'files/updateFileComment', payload: {} })),
  renameFile: jest.fn(() => ({ type: 'files/renameFile', payload: {} }))
}));

// Мокаем хук useIsMobile
jest.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: jest.fn(() => false)
}));

// Мокаем API функции
jest.mock('../../utils/api', () => ({
  downloadFileApi: jest.fn(),
  copyFileLinkApi: jest.fn()
}));

// Мокаем компоненты с правильными путями
jest.mock('../../components/FileUploadForm', () => {
  return function MockFileUploadForm() {
    return <div data-testid="file-upload-form">File Upload Form</div>;
  };
});

jest.mock('../../components/FileItem', () => {
  return function MockFileItem({ file, isMobile, loading, onDelete, onDownload, onCopyLink, onUpdateComment, onRename }) {
    return (
      <div data-testid={`file-item-${file.id}`} data-mobile={isMobile}>
        <span data-testid="file-name">{file.original_name}</span>
        <span data-testid="file-comment">{file.comment}</span>
        <button onClick={() => onDelete(file.id)} data-testid="delete-btn">
          Delete
        </button>
        <button onClick={() => onUpdateComment(file.id, 'new comment')} data-testid="update-comment-btn">
          Update Comment
        </button>
        <button onClick={() => onRename(file.id, 'new name')} data-testid="rename-btn">
          Rename
        </button>
        {loading && <span data-testid="file-loading">Loading...</span>}
      </div>
    );
  };
});

// Мокаем Ant Design
jest.mock('antd', () => ({
  Spin: ({ tip, size, ...props }) => (
    <div data-testid="spin" data-size={size} {...props}>
      <div data-testid="spin-tip">{tip}</div>
    </div>
  ),
  Alert: ({ message, description, type, showIcon, style, ...props }) => (
    <div data-testid="alert" className={`alert-${type}`} style={style} {...props}>
      <div data-testid="alert-message">{message}</div>
      {description && <div data-testid="alert-description">{description}</div>}
    </div>
  ),
  Empty: ({ description, style, ...props }) => (
    <div data-testid="empty" style={style} {...props}>
      <div data-testid="empty-description">{description}</div>
    </div>
  )
}));

// Мокаем react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  MemoryRouter: ({ children }) => <div data-testid="memory-router">{children}</div>
}));

// Импортируем компонент ПОСЛЕ всех моков
import StoragePage from '../StoragePage';
import { fetchFiles, deleteFile, updateFileComment, renameFile } from '../../store/filesSlice';
import { useIsMobile } from '../../hooks/useIsMobile';

describe('StoragePage', () => {
  const mockStore = configureStore({
    reducer: {
      files: (state = { files: [], loading: false, error: null, loadingIds: [] }) => state
    }
  });

  // Дефолтное состояние для useSelector
  const defaultState = {
    files: { files: [], loading: false, error: null, loadingIds: [] }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockClear();
    useIsMobile.mockReturnValue(false);
    // Устанавливаем дефолтное состояние
    mockUseSelector.mockImplementation((selector) => selector(defaultState));
  });

  const renderComponent = (state = {}) => {
    // Переопределяем состояние если передано
    if (Object.keys(state).length > 0) {
      mockUseSelector.mockImplementation((selector) => selector({ 
        files: { ...defaultState.files, ...state } 
      }));
    }

    return render(
      <Provider store={mockStore}>
        <MemoryRouter>
          <StoragePage />
        </MemoryRouter>
      </Provider>
    );
  };

  it('renders title and form', () => {
    renderComponent();
    
    expect(screen.getByText('Ваше файловое хранилище')).toBeInTheDocument();
    expect(screen.getByTestId('file-upload-form')).toBeInTheDocument();
  });

  it('shows loading spinner', () => {
    renderComponent({ loading: true });
    
    expect(screen.getByTestId('spin')).toBeInTheDocument();
    expect(screen.getByText('Загрузка файлов...')).toBeInTheDocument();
  });

  it('shows error alert', () => {
    renderComponent({ error: 'Ошибка загрузки' });
    
    expect(screen.getByTestId('alert')).toBeInTheDocument();
    expect(screen.getByText('Ошибка при загрузке файлов')).toBeInTheDocument();
    expect(screen.getByText('Ошибка загрузки')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    renderComponent({ files: [], loading: false, error: null });
    
    expect(screen.getByTestId('empty')).toBeInTheDocument();
    expect(screen.getByText('Файлы не найдены')).toBeInTheDocument();
  });

  it('renders files in table when not mobile', () => {
    const testFiles = [
      { id: 1, original_name: 'test.txt', uploaded_at: '2023-01-01T00:00:00Z', comment: 'Test file' }
    ];
    
    renderComponent({ files: testFiles, loading: false, error: null });
    
    expect(screen.getByTestId('file-item-1')).toBeInTheDocument();
    expect(screen.getByText('test.txt')).toBeInTheDocument();
    expect(screen.getByText('Файл')).toBeInTheDocument(); // заголовок таблицы
  });

  it('renders files in mobile view when isMobile is true', () => {
    useIsMobile.mockReturnValue(true);
    
    const testFiles = [
      { id: 1, original_name: 'test.txt', uploaded_at: '2023-01-01T00:00:00Z', comment: 'Test file' }
    ];
    
    renderComponent({ files: testFiles, loading: false, error: null });
    
    const fileItem = screen.getByTestId('file-item-1');
    expect(fileItem).toBeInTheDocument();
    expect(fileItem).toHaveAttribute('data-mobile', 'true');
  });

  it('fetches files on component mount', () => {
    renderComponent();
    
    expect(mockDispatch).toHaveBeenCalled();
    expect(fetchFiles).toHaveBeenCalled();
  });

  it('handles file deletion', () => {
    const testFiles = [
      { id: 1, original_name: 'test.txt', uploaded_at: '2023-01-01T00:00:00Z', comment: 'Test file' }
    ];
    
    renderComponent({ files: testFiles });
    
    const deleteButton = screen.getByTestId('delete-btn');
    fireEvent.click(deleteButton);
    
    expect(mockDispatch).toHaveBeenCalled();
    expect(deleteFile).toHaveBeenCalledWith(1);
  });

  it('handles update comment', () => {
    const testFiles = [
      { id: 1, original_name: 'test.txt', uploaded_at: '2023-01-01T00:00:00Z', comment: 'Test file' }
    ];
    
    renderComponent({ files: testFiles });
    
    const updateCommentButton = screen.getByTestId('update-comment-btn');
    fireEvent.click(updateCommentButton);
    
    expect(mockDispatch).toHaveBeenCalled();
    expect(updateFileComment).toHaveBeenCalledWith({ fileId: 1, comment: 'new comment' });
  });

  it('handles rename', () => {
    const testFiles = [
      { id: 1, original_name: 'test.txt', uploaded_at: '2023-01-01T00:00:00Z', comment: 'Test file' }
    ];
    
    renderComponent({ files: testFiles });
    
    const renameButton = screen.getByTestId('rename-btn');
    fireEvent.click(renameButton);
    
    expect(mockDispatch).toHaveBeenCalled();
    expect(renameFile).toHaveBeenCalledWith({ fileId: 1, newName: 'new name' });
  });

  it('shows loading state for specific files', () => {
    const testFiles = [
      { id: 1, original_name: 'test.txt', uploaded_at: '2023-01-01T00:00:00Z', comment: 'Test file' }
    ];
    
    renderComponent({ files: testFiles, loadingIds: [1] });
    
    expect(screen.getByTestId('file-loading')).toBeInTheDocument();
  });

  it('does not show spinner when not loading', () => {
    renderComponent({ files: [], loading: false });
    
    expect(screen.queryByTestId('spin')).not.toBeInTheDocument();
  });

  it('does not show error when no error', () => {
    renderComponent({ files: [], error: null });
    
    expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
  });

  it('renders table structure correctly', () => {
    const testFiles = [
      { id: 1, original_name: 'test.txt', uploaded_at: '2023-01-01T00:00:00Z', comment: 'Test file' }
    ];
    
    renderComponent({ files: testFiles });
    
    // Проверяем наличие заголовков таблицы
    expect(screen.getByText('Файл')).toBeInTheDocument();
    expect(screen.getByText('Комментарий')).toBeInTheDocument();
    expect(screen.getByText('Дата')).toBeInTheDocument();
    expect(screen.getByText('Действия')).toBeInTheDocument();
  });

  it('does not render table when no files and not loading', () => {
    renderComponent({ files: [], loading: false });
    
    expect(screen.queryByText('Файл')).not.toBeInTheDocument();
    expect(screen.getByTestId('empty')).toBeInTheDocument();
  });
});
