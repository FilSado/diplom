import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchFiles,
  deleteFile,
  updateFileComment,
  renameFile
} from '../store/filesSlice';
import FileUploadForm from '../components/FileUploadForm';
import FileItem from '../components/FileItem';
import { Spin, Alert, Empty, message } from 'antd';
import { useIsMobile } from '../hooks/useIsMobile';
import { downloadFileApi, copyFileLinkApi } from '../utils/api';


export default function StoragePage() {
  const dispatch = useDispatch();
  const { files, loading, error, loadingIds } = useSelector(state => state.files);
  const isMobile = useIsMobile();


  useEffect(() => {
    dispatch(fetchFiles());
  }, [dispatch]);


  const handleDelete = id => {
    dispatch(deleteFile(id));
  };


  const handleUpdateComment = (fileId, comment) => {
    dispatch(updateFileComment({ fileId, comment }));
  };


  const handleRename = (fileId, newName) => {
    dispatch(renameFile({ fileId, newName }));
  };


  const handleDownload = async file => {
    try {
      const blob = await downloadFileApi(file.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name || file.name || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      message.success('Файл скачан успешно!');
    } catch (err) {
      console.error('Download error:', err);
      message.error('Ошибка при скачивании файла');
    }
  };


const handleCopyLink = async file => {
  // v2: Fixed clipboard API for HTTP
  try {
    const response = await copyFileLinkApi(file.id);
    const link = response?.data?.public_url || 
             response?.public_url || 
             response?.data?.link ||
             response?.link ||
             file.public_url ||
             `http://83.166.245.17/storage/files/${file.id}`;
    
    // Создаём временное текстовое поле
    const textArea = document.createElement('textarea');
    textArea.value = link;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    // Пытаемся скопировать
    let success = false;
    try {
      success = document.execCommand('copy');
    } catch (err) {
      console.log('execCommand failed:', err);
    }
    
    document.body.removeChild(textArea);
    
    // Используем message.info для всех уведомлений
    if (success) {
      message.info('✅ Ссылка скопирована: ' + link);
    } else {
      message.info('📋 Скопируйте ссылку: ' + link);
    }
  } catch (err) {
    console.error('Copy link error:', err);
    message.error('Ошибка при получении ссылки');
  }
};



  return (
    <div style={{ padding: 24 }}>
      <h2>Ваше файловое хранилище</h2>


      <FileUploadForm />


      {loading && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Spin size="large" tip="Загрузка файлов..." />
        </div>
      )}


      {error && (
        <Alert
          type="error"
          message="Ошибка при загрузке файлов"
          description={error}
          showIcon
          style={{ margin: '16px 0' }}
        />
      )}


      {!loading && files.length === 0 && (
        <Empty
          description="Файлы не найдены"
          style={{ margin: '40px 0' }}
        />
      )}


      {!loading && files.length > 0 && (
        isMobile ? (
          files.map(file => (
            <FileItem
              key={file.id}
              file={file}
              isMobile
              loading={loadingIds.includes(file.id)}
              onDelete={handleDelete}
              onDownload={handleDownload}
              onCopyLink={handleCopyLink}
              onUpdateComment={handleUpdateComment}
              onRename={handleRename}
            />
          ))
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #f0f0f0' }}>Файл</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #f0f0f0' }}>Комментарий</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #f0f0f0' }}>Дата</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #f0f0f0' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {files.map(file => (
                <FileItem
                  key={file.id}
                  file={file}
                  loading={loadingIds.includes(file.id)}
                  onDelete={handleDelete}
                  onDownload={handleDownload}
                  onCopyLink={handleCopyLink}
                  onUpdateComment={handleUpdateComment}
                  onRename={handleRename}
                />
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  );
}
