import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser } from '../store/authSlice';
import { Navigate } from 'react-router-dom';
import { Form, Input, Button, Alert } from 'antd';

export default function RegisterPage() {
  const dispatch = useDispatch();
  const { isAuthenticated, loading, error } = useSelector(s => s.auth);

  if (isAuthenticated) {
    return <Navigate to="/storage" replace />;
  }

  const onFinish = values => {
    // Собираем payload в snake_case, включая password_confirm
    const payload = {
      username: values.username,
      full_name: values.full_name,
      email: values.email,
      password: values.password,
      password_confirm: values.passwordConfirm,
    };
    dispatch(registerUser(payload));
  };

  return (
    <Form
      name="register"
      onFinish={onFinish}
      style={{ maxWidth: 400, margin: 'auto', padding: '40px 0' }}
      layout="vertical"
    >
      <h2>Регистрация</h2>

      {error && (
        <Alert
          type="error"
          message={typeof error === 'string' ? error : 'Ошибка регистрации'}
          description={
            typeof error === 'object'
              ? Object.entries(error).map(([field, msgs]) => (
                  <div key={field}>
                    <b>{field.replace(/_/g, ' ')}:</b> {msgs.join(' ')}
                  </div>
                ))
              : null
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Form.Item
        name="username"
        label="Логин"
        rules={[
          { required: true, message: 'Обязательное поле.' },
          { pattern: /^[a-zA-Z][a-zA-Z0-9]{3,19}$/, message: '4–20 символов, латиница и цифры' },
        ]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        name="full_name"
        label="Полное имя"
        rules={[{ required: true, message: 'Укажите полное имя' }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        name="email"
        label="Email"
        rules={[
          { required: true, message: 'Укажите email' },
          { type: 'email', message: 'Введите корректный email' },
        ]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        name="password"
        label="Пароль"
        rules={[
          { required: true, message: 'Укажите пароль' },
          {
            pattern: /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{6,}$/,
            message: 'Мин.6 символов, заглавная буква, цифра, спецсимвол',
          },
        ]}
      >
        <Input.Password />
      </Form.Item>

      <Form.Item
        name="passwordConfirm"
        label="Подтвердите пароль"
        dependencies={['password']}
        rules={[
          { required: true, message: 'Подтвердите пароль' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('Пароли не совпадают.'));
            },
          }),
        ]}
      >
        <Input.Password />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          Зарегистрироваться
        </Button>
      </Form.Item>
    </Form>
  );
}