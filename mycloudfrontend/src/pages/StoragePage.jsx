import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFiles, deleteFile, updateFileComment } from '../store/filesSlice';
import FileUploadForm from '../components/FileUploadForm';
import FileItem from '../components/FileItem';

const StoragePage = () => {
  const dispatch = useDispatch();
  const { files, loading, error } = useSelector(state => state.files);

  useEffect(() => {
    dispatch(fetchFiles());
  }, [dispatch]);

  const handleDelete = (id) => {
    if (window.confirm('Удалить файл?')) {
      dispatch(deleteFile(id));
    }
  };

  // Функция для скачивания файла с авторизацией
  const handleDownload = async (file) => {
    try {
      const tokens = JSON.parse(localStorage.getItem('tokens'));
      const response = await fetch(`/api/files/${file.id}/download/`, {
        headers: {
          Authorization: `Bearer ${tokens.access}`,
        },
      });
      if (!response.ok) {
        alert('Ошибка загрузки файла');
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      alert('Ошибка при скачивании файла');
    }
  };

  // Функция для копирования публичной ссылки на файл
  const handleCopyLink = (file) => {
    const publicUrl = file.public_url || `${window.location.origin}/api/files/public/${file.public_link}/`;
    navigator.clipboard.writeText(publicUrl);
    alert('Ссылка скопирована!');
  };

  // Функция для обновления комментария
  const handleUpdateComment = (fileId, comment) => {
    dispatch(updateFileComment({ fileId, comment }));
  };

  return (
    <div className="container">
      <h2>Ваше файловое хранилище</h2>
      <FileUploadForm />
      {loading && <p>Загрузка файлов...</p>}
      {error && <p className="error-message">{error}</p>}
      {files.length === 0 && !loading ? (
        <p>Файлы не найдены.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Имя файла</th>
              <th>Комментарий</th>
              <th>Размер</th>
              <th>Дата загрузки</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {files.map(file => (
              <FileItem
                key={file.id}
                file={file}
                onDelete={handleDelete}
                onDownload={() => handleDownload(file)}
                onCopyLink={() => handleCopyLink(file)}
                onUpdateComment={handleUpdateComment}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default StoragePage;
