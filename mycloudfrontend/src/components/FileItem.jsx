import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { hasAccess } from '../utils/auth';
import {
  Button,
  Input,
  Tooltip,
  message,
  Popconfirm,
  Space,
  Typography,
  Card,
  Modal
} from 'antd';
import {
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  DeleteOutlined,
  DownloadOutlined,
  LinkOutlined,
  CalendarOutlined,
  FileTextOutlined
} from '@ant-design/icons';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function FileItem({
  file,
  onDelete,
  onDownload,
  onCopyLink,
  onUpdateComment,
  onRename,
  loading = false,
  isMobile = false
}) {
  const user = useSelector(state => state.auth.user);
  const isOwnerOrAdmin = hasAccess(user, ['admin']) || user?.id === file.user_id;

  const [isEditing, setIsEditing] = useState(false);
  const [comment, setComment] = useState(file.comment || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [newName, setNewName] = useState(file.original_name);

  const saveComment = async () => {
    if (comment.length > 500) {
      message.error('Комментарий слишком длинный (максимум 500 символов)');
      return;
    }
    setIsLoading(true);
    try {
      await onUpdateComment(file.id, comment);
      setIsEditing(false);
      message.success('Комментарий обновлен');
    } catch {
      message.error('Ошибка при обновлении комментария');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (onCopyLink) {
      onCopyLink(file);
    } else {
      message.error('Функция копирования недоступна');
    }
};

  const handleDownloadClick = () => onDownload(file);

  const handleDeleteClick = () => onDelete(file.id);

  const openRenameModal = () => {
    setNewName(file.original_name);
    setIsRenameModalOpen(true);
  };

  const handleRename = async () => {
    if (!newName.trim()) {
      message.error('Имя файла не может быть пустым');
      return;
    }
    setIsLoading(true);
    try {
      await onRename(file.id, newName.trim());
      setIsRenameModalOpen(false);
      message.success('Имя файла изменено');
    } catch {
      message.error('Ошибка при переименовании файла');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = bytes => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDate = () => {
    const dateString = file.last_download;
    if (!dateString) return 'Дата отсутствует';
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Неверная дата';
    }
  };

  const getFileIcon = filename => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return '🖼️';
    if (ext === 'pdf') return '📄';
    if (['doc','docx'].includes(ext)) return '📝';
    if (['xls','xlsx'].includes(ext)) return '📊';
    if (['zip','rar','7z'].includes(ext)) return '🗜️';
    return '📁';
  };

  const renameModal = (
    <Modal
      title="Переименовать файл"
      open={isRenameModalOpen}
      onOk={handleRename}
      onCancel={() => setIsRenameModalOpen(false)}
      okText="Сохранить"
      cancelText="Отмена"
      confirmLoading={isLoading}
    >
      <Input
        value={newName}
        onChange={e => setNewName(e.target.value)}
        maxLength={255}
        placeholder="Новое имя файла"
      />
    </Modal>
  );

  // Mobile card view
  if (isMobile) {
    return (
      <>
        <Card
          size="small"
          style={{ marginBottom: 16 }}
          actions={[
            <Tooltip title="Скачать файл" key="download">
              <Button
                type="text"
                icon={<DownloadOutlined />}
                onClick={handleDownloadClick}
                loading={loading}
                aria-label="скачать файл"
                aria-busy={loading}
              />
            </Tooltip>,
            <Tooltip title="Копировать ссылку" key="link">
              <Button
                type="text"
                icon={<LinkOutlined />}
                onClick={handleCopyLink}
                aria-label="копировать ссылку"
              />
            </Tooltip>,
            isOwnerOrAdmin && (
              <Tooltip title="Переименовать" key="rename">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={openRenameModal}
                  aria-label="переименовать"
                />
              </Tooltip>
            ),
            isOwnerOrAdmin && (
              <Popconfirm
                key="delete"
                title="Удалить файл?"
                onConfirm={handleDeleteClick}
                okText="Да"
                cancelText="Нет"
                okButtonProps={{ loading }}
              >
                <Tooltip title="Удалить файл">
                  <Button 
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={loading}
                  aria-label="удалить файл"
                />
                </Tooltip>
              </Popconfirm>
            )
          ].filter(Boolean)}
        >
          <Space>
            <span style={{ fontSize: 20 }}>{getFileIcon(file.original_name)}</span>
            <div>
              <Text strong>{file.original_name}</Text><br/>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {formatFileSize(file.size)}
              </Text>
            </div>
          </Space>
          <div style={{ marginTop: 12 }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div>
                <CalendarOutlined />{' '}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {formatDate()}
                </Text>
              </div>
              <div>
                <FileTextOutlined />{' '}
                {isEditing ? (
                  <>
                    <TextArea
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      maxLength={500}
                      showCount
                      rows={2}
                      disabled={isLoading}
                      style={{ marginBottom: 8 }}
                    />
                    <Space>
                      <Button
                        type="primary"
                        size="small"
                        icon={<SaveOutlined />}
                        onClick={saveComment}
                        loading={isLoading}
                      >
                        Сохранить
                      </Button>
                      <Button
                        size="small"
                        icon={<CloseOutlined />}
                        onClick={() => {
                          setIsEditing(false);
                          setComment(file.comment || '');
                        }}
                        disabled={isLoading}
                      >
                        Отмена
                      </Button>
                    </Space>
                  </>
                ) : (
                  <>
                    <Paragraph ellipsis={{ rows: 2, expandable: true }} style={{ margin: 0 }}>
                      {comment || <em>Нет комментария</em>}
                    </Paragraph>
                    {isOwnerOrAdmin && (
                      <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => setIsEditing(true)}
                        style={{ padding: 0, height: 'auto' }}
                      >
                        Редактировать
                      </Button>
                    )}
                  </>
                )}
              </div>
            </Space>
          </div>
        </Card>
        {renameModal}
      </>
    );
  }

  // Desktop table row view
  return (
    <>
      <tr>
        <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>
          <Space>
            <span style={{ fontSize: 18 }}>{getFileIcon(file.original_name)}</span>
            <div>
              <Text strong>{file.original_name}</Text><br/>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {formatFileSize(file.size)}
              </Text>
            </div>
          </Space>
        </td>
        <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>
          {isEditing ? (
            <>
              <TextArea
                value={comment}
                onChange={e => setComment(e.target.value)}
                maxLength={500}
                showCount
                rows={2}
                disabled={isLoading}
                style={{ marginBottom: 8 }}
              />
              <Space>
                <Button
                  type="primary"
                  size="small"
                  icon={<SaveOutlined />}
                  onClick={saveComment}
                  loading={isLoading}
                >
                  Сохранить
                </Button>
                <Button
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => {
                    setIsEditing(false);
                    setComment(file.comment || '');
                  }}
                  disabled={isLoading}
                >
                  Отмена
                </Button>
              </Space>
            </>
          ) : (
            <>
              <Paragraph ellipsis={{ rows: 2, expandable: true }} style={{ margin: 0 }}>
                {comment || <em>Нет комментария</em>}
              </Paragraph>
              {isOwnerOrAdmin && (
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => setIsEditing(true)}
                  style={{ padding: 0, height: 'auto' }}
                >
                  Редактировать
                </Button>
              )}
            </>
          )}
        </td>
        <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>
          <Text type="secondary">{formatDate()}</Text>
        </td>
        <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>
          <Space>
            <Tooltip title="Скачать файл">
              <Button
                aria-label="скачать файл"
                type="primary"
                ghost
                icon={<DownloadOutlined />}
                onClick={handleDownloadClick}
                loading={loading}
                aria-busy={loading}
              />
            </Tooltip>
            <Tooltip title="Копировать ссылку">
              <Button
                icon={<LinkOutlined />}
                onClick={handleCopyLink}
                aria-label="копировать ссылку"
                aria-busy={loading}
              />
            </Tooltip>
            {isOwnerOrAdmin && (
              <Tooltip title="Переименовать">
                <Button 
                  icon={<EditOutlined />}
                  onClick={openRenameModal}
                  aria-label="переименовать"
                 />
              </Tooltip>
            )}
            {isOwnerOrAdmin && (
              <Popconfirm
                title="Удалить файл?"
                onConfirm={handleDeleteClick}
                okText="Да"
                cancelText="Нет"
                okButtonProps={{ loading }}
              >
                <Tooltip title="Удалить файл">
                  <Button
                  danger
                  icon={<DeleteOutlined />}
                  disabled={loading}
                  aria-label="удалить файл"
                  aria-busy={loading}
                />
                </Tooltip>
              </Popconfirm>
            )}
          </Space>
        </td>
      </tr>
      {renameModal}
    </>
  );
}
