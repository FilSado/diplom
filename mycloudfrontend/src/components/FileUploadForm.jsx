import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { uploadFile } from '../store/filesSlice';

const FileUploadForm = () => {
  const dispatch = useDispatch();
  const loading = useSelector(state => state.files.loading);
  const error = useSelector(state => state.files.error);

  const [file, setFile] = useState(null);
  const [comment, setComment] = useState('');

  const handleChange = (e) => setFile(e.target.files[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) return;
    // Отправляем правильный URL с нужным параметром
    dispatch(uploadFile({ file, comment, url: 'http://localhost:8000/api/files/upload/' }));
    setFile(null);
    setComment('');
    e.target.reset();
  };

  return (
    <form onSubmit={handleSubmit} style={{marginBottom: "2rem"}}>
      <label>
        Файл:
        <input type="file" onChange={handleChange} required />
      </label>
      <label style={{marginLeft: "1rem"}}>
        Комментарий:
        <input
          type="text"
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Комментарий к файлу"
        />
      </label>
      <button type="submit" disabled={loading || !file} style={{marginLeft: "1rem"}}>
        {loading ? 'Загрузка...' : 'Загрузить'}
      </button>
      {error && <div className="error-message">{error}</div>}
    </form>
  );
};

export default FileUploadForm;
