import React, { useState } from 'react';

const API_BASE_URL = '/api'; 
const RegisterPage = () => {
  const [login, setLogin] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const loginRe = /^[a-zA-Z][a-zA-Z0-9]{3,19}$/;
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRe = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{6,}$/;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!loginRe.test(login)) {
      setError('Логин должен содержать только латинские буквы и цифры, начинаться с буквы, 4–20 символов.');
      return;
    }
    if (!emailRe.test(email)) {
      setError('Введите корректный email.');
      return;
    }
    if (!passwordRe.test(password)) {
      setError('Пароль — минимум 6 символов, 1 заглавная, 1 цифра, 1 спецсимвол.');
      return;
    }
    if (!fullName.trim()) {
      setError('Необходимо указать полное имя.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: login,       // ключ username, значение из переменной login
          full_name: fullName,   // ключ full_name, значение из переменной fullName
          email: email,          // ключ email, значение из переменной email
          password: password,    // ключ password, значение из переменной password
        }),
      });


      const data = await response.json();
      console.log('Ответ сервера:', data);

      if (!response.ok) {
        if (data.detail) {
          setError(data.detail);
        } else if (typeof data === 'object') {
          const messages = [];
          for (const key in data) {
            if (Array.isArray(data[key])) {
              messages.push(`${key}: ${data[key].join(', ')}`);
            } else {
              messages.push(`${key}: ${data[key]}`);
            }
          }
          setError(messages.join('; '));
        } else {
          setError('Ошибка регистрации');
        }
        return;
      }

      setSuccess(true);
      setLogin('');
      setFullName('');
      setEmail('');
      setPassword('');
    } catch (e) {
      setError('Ошибка соединения с сервером.');
    }
  };

  return (
    <div className="container">
      <h2>Регистрация</h2>
      {success && (
        <p style={{ color: 'green', fontWeight: 600, marginBottom: 8 }}>
          Регистрация успешна! Теперь можно выполнить вход.
        </p>
      )}
      <form onSubmit={handleSubmit} noValidate>
        <label>
          Логин:
          <input
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            pattern="^[a-zA-Z][a-zA-Z0-9]{3,19}$"
            required
            title="Латинские буквы и цифры, первый символ — буква, 4–20 символов"
          />
        </label>
        <label>
          Полное имя:
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </label>
        <label>
          Email:
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
            title="Введите корректный email"
          />
        </label>
        <label>
          Пароль:
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            pattern="^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{6,}$"
            title="Мин. 6 символов, заглавная буква, цифра, спецсимвол"
          />
        </label>
        <button type="submit">Зарегистрироваться</button>
      </form>
      {error && <div className="error-message" style={{ color: 'red', marginTop: '10px' }}>{error}</div>}
    </div>
  );
};

export default RegisterPage;
