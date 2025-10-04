import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '../store/authSlice';
import { Navigate } from 'react-router-dom';
import { Form, Input, Button, Alert } from 'antd';

export default function LoginPage() {
  const dispatch = useDispatch();
  const { isAuthenticated, loading, error } = useSelector(s => s.auth);

  if (isAuthenticated) {
    return <Navigate to="/storage" replace />;
  }

  const onFinish = ({ username, password }) => {
    dispatch(loginUser({ username, password }));
  };

  return (
    <Form
      name="login"
      onFinish={onFinish}
      style={{ maxWidth: 360, margin: 'auto', padding: '40px 0' }}
      layout="vertical"
    >
      <h2>Вход в систему</h2>
      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
      
      <Form.Item
        name="username"
        label="Логин"
        rules={[
          { required: true, message: 'Введите логин' },
          { min: 3, message: 'Минимум 3 символа' },
          { max: 20, message: 'Максимум 20 символов' }
        ]}
      >
        <Input placeholder="Введите логин" />
      </Form.Item>
      
      <Form.Item
        name="password"
        label="Пароль"
        rules={[
          { required: true, message: 'Введите пароль' },
          { min: 6, message: 'Минимум 6 символов' }
        ]}
      >
        <Input.Password placeholder="Введите пароль" />
      </Form.Item>
      
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          Войти
        </Button>
      </Form.Item>
      
      {/* Демо данные для защиты диплома 
      <div style={{ 
        marginTop: '20px', 
        padding: '12px', 
        backgroundColor: '#f6f6f6', 
        borderRadius: '6px',
        fontSize: '12px',
        textAlign: 'center',
        color: '#666'
      }}>
        <div><strong>Демо-доступ:</strong></div>
        <div>👑 admin / 123456</div>
        <div>👤 demo / 123456</div>
      </div>
      */}
    </Form>
  );
}
