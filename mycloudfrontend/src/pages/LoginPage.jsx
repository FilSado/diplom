import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '../store/authSlice';
import { Navigate } from 'react-router-dom';

const LoginPage = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, loading, error } = useSelector(state => state.auth);

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginUser({ login, password }));
  };

  if (isAuthenticated) {
    // Здесь можно дополнительно обработать роль, если она передаётся
    return <Navigate to="/storage" replace />;
  }

  return (
    <div className="container">
      <h2>Вход в систему</h2>
      <form onSubmit={handleSubmit} noValidate>
        <label>
          Логин:
          <input
            type="text"
            value={login}
            onChange={e => setLogin(e.target.value)}
            required
            pattern="^[a-zA-Z][a-zA-Z0-9]{3,19}$"
            title="Логин: латинские буквы и цифры, первый символ - буква, 4-20 символов"
          />
        </label>

        <label>
          Пароль:
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            pattern="^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{6,}$"
            title="Пароль: минимум 6 символов, с заглавной буквой, цифрой и спецсимволом"
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>

      {error && <p className="error-message">{error}</p>}
    </div>
  );
};

export default LoginPage;
