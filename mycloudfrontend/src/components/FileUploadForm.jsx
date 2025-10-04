import React, { useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Upload,
  Button,
  Input,
  Progress,
  Alert,
  Typography,
  Space,
  message,
  Card
} from 'antd';
import {
  InboxOutlined,
  UploadOutlined
} from '@ant-design/icons';
import { uploadFiles } from '../store/filesSlice';

const { TextArea } = Input;
const { Dragger } = Upload;
const { Text, Title } = Typography;

const FileUploadForm = () => {
  const dispatch = useDispatch();
  const { loading, error, uploadProgress } = useSelector(state => state.files);

  const [fileList, setFileList] = useState([]);
  const [comment, setComment] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const fileConfig = useMemo(() => ({
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: [
      'image/jpeg','image/png','image/gif','image/webp','image/svg+xml',
      'application/pdf','text/plain','text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip','application/x-rar-compressed','application/x-7z-compressed'
    ],
    allowedExtensions: [
      '.jpg','.jpeg','.png','.gif','.webp','.svg',
      '.pdf','.txt','.csv','.doc','.docx','.xls','.xlsx',
      '.zip','.rar','.7z'
    ]
  }), []);

  const validateFile = useCallback((file) => {
    const errors = [];
    if (file.size > fileConfig.maxSize) {
      errors.push(`Файл "${file.name}" превышает максимальный размер ${fileConfig.maxSize/1024/1024}MB`);
    }
    if (!fileConfig.allowedTypes.includes(file.type)) {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!fileConfig.allowedExtensions.includes(ext)) {
        errors.push(`Неподдерживаемый тип файла: ${file.name}`);
      }
    }
    return errors;
  }, [fileConfig]);

  const handleFileChange = ({ fileList: newList }) => {
    const validated = newList.map(file => {
      if (file.originFileObj) {
        const errs = validateFile(file.originFileObj);
        if (errs.length > 0) {
          file.status = 'error';
          file.error = { message: errs.join(', ') };
          message.error(errs);
        }
      }
      return file;
    });
    setFileList(validated);
  };

  const handleUpload = async ({ file, onSuccess, onError }) => {
    const errs = validateFile(file);
    if (errs.length > 0) {
      onError(new Error(errs.join(', ')));
      return;
    }
    try {
      const result = await dispatch(uploadFiles({ files: [file], comment })).unwrap();
      onSuccess(result);
      message.success(`Файл "${file.name}" успешно загружен`);
      setFileList([]);
      setComment('');
    } catch (err) {
      onError(err);
      message.error(`Ошибка при загрузке файла "${file.name}": ${err.message}`);
    }
  };

  const uploadProps = {
    name: 'file',
    multiple: true,
    fileList,
    onChange: handleFileChange,
    customRequest: handleUpload,
    beforeUpload: (file) => {
      const errs = validateFile(file);
      if (errs.length > 0) {
        message.error(errs);
        return false;
      }
      return true;
    },
    onDrop: () => setDragActive(false),
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    showUploadList: { showPreviewIcon: true, showRemoveIcon: true, showDownloadIcon: false },
    progress: {
      strokeColor: { '0%':'#108ee9','100%':'#87d068' },
      strokeWidth: 3,
      format: p => `${p.toFixed(2)}%`
    },
  };

  const formatFileTypes = () => fileConfig.allowedExtensions.join(', ').toUpperCase();

  return (
    <Card
      className="file-upload-form"
      title={<Title level={4} style={{ margin: 0 }}>Загрузка файлов</Title>}
      style={{ marginBottom: '2rem' }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {error && (
          <Alert
            message="Ошибка загрузки"
            description={typeof error === 'string' ? error : error.message}
            type="error"
            showIcon
            closable
            style={{ marginBottom: 16 }}
          />
        )}

        <div>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>Комментарий к файлу(ам)</Text>
          <TextArea
            value={comment}
            onChange={e => {
              const v = e.target.value;
              setComment(v.length > 500 ? v.slice(0, 500) : v);
            }}
            placeholder="Добавьте описание..."
            rows={3}
            maxLength={500}
            showCount
            disabled={loading}
            aria-label="Комментарий к файлу"
          />
        </div>

        <Dragger
          {...uploadProps}
          className={dragActive ? 'drag-active' : ''}
          disabled={loading}
          style={{
            background: dragActive ? '#f0f8ff' : undefined,
            borderColor: dragActive ? '#1890ff' : undefined
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ fontSize: 48, color: '#1890ff' }}/>
          </p>
          <p className="ant-upload-text" style={{ fontSize: 16, fontWeight: 500 }}>
            Перетащите файлы сюда или нажмите для выбора
          </p>
          <p className="ant-upload-hint" style={{ color: '#8c8c8c' }}>
            Поддерживаются: {formatFileTypes()}<br/>
            Максимальный размер: {fileConfig.maxSize/1024/1024}MB
          </p>
        </Dragger>

        <div style={{ textAlign: 'center' }}>
          <Upload {...uploadProps} showUploadList={false}>
            <Button
              icon={<UploadOutlined />}
              size="large"
              disabled={loading}
              loading={loading}
              aria-label="Выбрать файлы"
              aria-busy={loading}
            >
              Выбрать файлы
            </Button>
          </Upload>
        </div>

        {uploadProgress > 0 && uploadProgress < 100 && (
          <div>
            <Text style={{ display: 'block', marginBottom: 8 }}>
              Загрузка файлов: {uploadProgress}%
            </Text>
            <Progress
              percent={uploadProgress}
              status="active"
              strokeColor={{ '0%':'#108ee9','100%':'#87d068' }}
            />
          </div>
        )}

        <Alert
          message="Информация о загрузке"
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>Максимальный размер файла: 100MB</li>
              <li>Можно загружать несколько файлов</li>
              <li>Поддерживается drag & drop</li>
              <li>Файлы проверяются на безопасность</li>
            </ul>
          }
          type="info"
          showIcon
        />
      </Space>
    </Card>
  );
};

export default FileUploadForm;