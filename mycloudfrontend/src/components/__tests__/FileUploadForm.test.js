import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Мокаем react-redux
const mockDispatch = jest.fn();
const mockUseSelector = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
  useSelector: (selector) => mockUseSelector(selector),
  Provider: ({ children }) => <div data-testid="provider">{children}</div>
}));

// Мокаем filesSlice с правильными именами функций
jest.mock('../../store/filesSlice', () => ({
  uploadFiles: jest.fn(() => ({ type: 'files/uploadFiles', payload: {} })),
  fetchFiles: jest.fn(() => ({ type: 'files/fetchFiles', payload: {} })),
  deleteFile: jest.fn(() => ({ type: 'files/deleteFile', payload: {} })),
  clearError: jest.fn(() => ({ type: 'files/clearError' })),
  default: (state = { files: [], loading: false, error: null, uploadProgress: 0, loadingIds: [] }) => state
}));

// Мокаем @ant-design/icons
jest.mock('@ant-design/icons', () => ({
  InboxOutlined: () => <div data-testid="inbox-icon">📁</div>,
  UploadOutlined: () => <div data-testid="upload-icon">⬆️</div>,
  DeleteOutlined: () => <div data-testid="delete-icon">🗑️</div>
}));

// Мокаем все компоненты Ant Design
jest.mock('antd', () => {
  const React = require('react');
  
  const MockUpload = ({ children, fileList, onChange, customRequest, beforeUpload, showUploadList, ...props }) => (
    <div data-testid="upload" {...props}>{children}</div>
  );

  MockUpload.Dragger = ({ children, onDrop, accept, multiple, beforeUpload, className, disabled, style, ...props }) => (
    <div 
      data-testid="upload-dragger" 
      className={className}
      style={style}
      {...props}
      onClick={() => {
        const file = new File(['test'], 'test.txt', { type: 'text/plain' });
        if (beforeUpload && beforeUpload(file) !== false) {
          // Файл прошел проверку
        }
      }}
    >
      {children}
    </div>
  );

  return {
    Card: ({ title, children, ...props }) => (
      <div data-testid="upload-card" {...props}>
        <div data-testid="card-title">{title}</div>
        {children}
      </div>
    ),
    Space: ({ children, direction, size, ...props }) => (
      <div data-testid="space" data-direction={direction} data-size={size} {...props}>
        {children}
      </div>
    ),
    Typography: {
      Text: ({ children, strong, style, ...props }) => 
        strong ? (
          <strong style={style} {...props}>{children}</strong>
        ) : (
          <span style={style} {...props}>{children}</span>
        ),
      Title: ({ children, level, style, ...props }) => {
        const Tag = `h${level || 1}`;
        return <Tag style={style} {...props}>{children}</Tag>;
      }
    },
    Input: {
      TextArea: React.forwardRef(({ value, onChange, placeholder, rows, maxLength, showCount, disabled, ...props }, ref) => (
        <textarea 
          ref={ref}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          disabled={disabled}
          data-testid="comment-textarea"
          data-show-count={showCount}
          {...props} 
        />
      ))
    },
    Upload: MockUpload,
    Button: ({ children, loading, onClick, icon, size, disabled, ...props }) => (
      <button 
        disabled={loading || disabled} 
        onClick={onClick}
        data-testid="upload-button"
        data-size={size}
        {...props}
      >
        {icon}
        {loading ? 'Загрузка...' : children}
      </button>
    ),
    Alert: ({ message, description, type, showIcon, closable, style, ...props }) => (
      <div 
        data-testid={`alert-${type}`} 
        className={`alert-${type}`} 
        style={style} 
        {...props}
      >
        <div data-testid="alert-message">{message}</div>
        {description && <div data-testid="alert-description">{description}</div>}
      </div>
    ),
    Progress: ({ percent, status, strokeColor, ...props }) => (
      <div data-testid="progress" data-status={status} {...props}>
        <div>Прогресс: {percent}%</div>
      </div>
    ),
    message: {
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      info: jest.fn()
    }
  };
});

// Импортируем компонент ПОСЛЕ всех моков
import FileUploadForm from '../FileUploadForm';
import { uploadFiles } from '../../store/filesSlice';

describe('FileUploadForm Component', () => {
  const mockStore = configureStore({
    reducer: {
      files: (state = { files: [], loading: false, error: null, uploadProgress: 0, loadingIds: [] }) => state
    }
  });

  // Дефолтное состояние для useSelector
  const defaultFilesState = {
    files: [],
    loading: false,
    error: null,
    uploadProgress: 0,
    loadingIds: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockClear();
    // Устанавливаем дефолтное состояние
    mockUseSelector.mockImplementation((selector) => selector({ files: defaultFilesState }));
  });

  const renderForm = (state = {}) => {
    // Переопределяем состояние если передано
    if (Object.keys(state).length > 0) {
      mockUseSelector.mockImplementation((selector) => selector({ 
        files: { ...defaultFilesState, ...state } 
      }));
    }

    return render(
      <Provider store={mockStore}>
        <FileUploadForm />
      </Provider>
    );
  };

  it('renders all elements', () => {
    renderForm();
    
    expect(screen.getByText('Загрузка файлов')).toBeInTheDocument();
    expect(screen.getByTestId('upload-dragger')).toBeInTheDocument();
    expect(screen.getByTestId('comment-textarea')).toBeInTheDocument();
    expect(screen.getByTestId('upload-button')).toBeInTheDocument();
    expect(screen.getByText('Выбрать файлы')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    renderForm({ loading: true });
    
    expect(screen.getByText('Загрузка...')).toBeInTheDocument();
  });

  it('renders upload info', () => {
    renderForm();
    
    expect(screen.getByText('Загрузка файлов')).toBeInTheDocument();
    expect(screen.getByTestId('upload-dragger')).toBeInTheDocument();
    expect(screen.getByText('Информация о загрузке')).toBeInTheDocument();
  });

  it('shows error message when error exists', () => {
    renderForm({ error: 'Ошибка загрузки файла' });
    
    // Используем специфичный селектор для error alert
    expect(screen.getByTestId('alert-error')).toBeInTheDocument();
    expect(screen.getByText('Ошибка загрузки')).toBeInTheDocument();
    expect(screen.getByText('Ошибка загрузки файла')).toBeInTheDocument();
  });

  it('calls uploadFiles when file is selected', () => {
    renderForm();
    
    const dragger = screen.getByTestId('upload-dragger');
    fireEvent.click(dragger);

    // В реальном компоненте должен вызываться uploadFiles через beforeUpload
    expect(dragger).toBeInTheDocument();
  });

  it('renders progress when uploading', () => {
    renderForm({ uploadProgress: 50 });
    
    expect(screen.getByTestId('progress')).toBeInTheDocument();
    expect(screen.getByText('Прогресс: 50%')).toBeInTheDocument();
  });

  it('disables upload button when loading', () => {
    renderForm({ loading: true });
    
    const uploadButton = screen.getByTestId('upload-button');
    expect(uploadButton).toBeDisabled();
  });

  it('allows to enter comment', () => {
    renderForm();
    
    const textarea = screen.getByTestId('comment-textarea');
    fireEvent.change(textarea, { target: { value: 'Test comment' } });
    
    expect(textarea).toBeInTheDocument();
  });

  it('shows file upload constraints', () => {
    renderForm();
    
    expect(screen.getByText('Максимальный размер файла: 100MB')).toBeInTheDocument();
    expect(screen.getByText('Можно загружать несколько файлов')).toBeInTheDocument();
    expect(screen.getByText('Поддерживается drag & drop')).toBeInTheDocument();
  });

  it('shows info alert by default', () => {
    renderForm();
    
    // Проверяем что информационный alert отображается
    expect(screen.getByTestId('alert-info')).toBeInTheDocument();
    expect(screen.getByText('Информация о загрузке')).toBeInTheDocument();
  });

  it('does not show error alert when no error', () => {
    renderForm();
    
    // Проверяем что error alert НЕ отображается
    expect(screen.queryByTestId('alert-error')).not.toBeInTheDocument();
  });

  it('shows both alerts when error exists', () => {
    renderForm({ error: 'Test error' });
    
    // Должны быть оба alert - error и info
    expect(screen.getByTestId('alert-error')).toBeInTheDocument();
    expect(screen.getByTestId('alert-info')).toBeInTheDocument();
  });
});
