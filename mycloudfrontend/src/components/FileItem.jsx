import React, { useState } from 'react';

const FileItem = ({ file, onDelete, onDownload, onCopyLink, onUpdateComment }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [comment, setComment] = useState(file.comment || '');

  const saveComment = () => {
    if (comment.length > 500) {
      alert('Комментарий слишком длинный (максимум 500 символов)');
      return;
    }
    onUpdateComment(file.id, comment);
    setIsEditing(false);
  };

  return (
    <tr>
      <td>{file.original_name}</td>
      <td>
        {isEditing ? (
          <>
            <input
              type="text"
              value={comment}
              maxLength={500}
              onChange={e => setComment(e.target.value)}
              style={{ width: '100%' }}
            />
            <button onClick={saveComment} style={{ marginLeft: 5 }}>Сохранить</button>
            <button onClick={() => { setIsEditing(false); setComment(file.comment || ''); }} style={{ marginLeft: 5 }}>Отмена</button>
          </>
        ) : (
          <>
            {file.comment || '-'}
            <button onClick={() => setIsEditing(true)} style={{ marginLeft: 10 }}>Редактировать</button>
          </>
        )}
      </td>
      <td>{(file.size / 1024).toFixed(2)} КБ</td>
      <td>{new Date(file.upload_date).toLocaleString()}</td>
      <td>
        <button
          onClick={() => onDownload(file)}
          style={{ marginRight: "0.5rem" }}
        >
          Скачать
        </button>
        <button
          onClick={() => onCopyLink(file)}
          style={{ marginRight: "0.5rem" }}
        >
          Копировать ссылку
        </button>
        <button
          onClick={() => onDelete(file.id)}
          style={{ color: "red" }}
        >
          Удалить
        </button>
      </td>
    </tr>
  );
};

export default FileItem;
