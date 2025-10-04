import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin, Result, Button } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';

const PrivateRoute = ({ 
  children, 
  requireAdmin = false,
  fallbackPath = '/login' 
}) => {
  const location = useLocation();
  const { 
    isAuthenticated, 
    user, 
    loading 
  } = useSelector(state => state.auth);
  
  const [isReady, setIsReady] = useState(false);

  // Даем время на инициализацию состояния
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // ИСПРАВЛЕННАЯ проверка прав доступа
  const hasPermission = () => {
    if (!user) return false;
    
    // Проверка на администратора - ИСПРАВЛЕНО!
    if (requireAdmin && !user.is_superuser && !user.is_staff) {
      return false;
    }
    
    return true;
  };

  // Показываем загрузку пока проверяем
  if (loading || !isReady) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '50vh',
        flexDirection: 'column'
      }}>
        <Spin size="large" tip="Проверка доступа..." />
      </div>
    );
  }

  // Если пользователь не аутентифицирован
  if (!isAuthenticated) {
    return (
      <Navigate 
        to={fallbackPath} 
        state={{ 
          from: location.pathname,
          message: 'Необходимо войти в систему'
        }} 
        replace 
      />
    );
  }

  // Если у пользователя недостаточно прав
  if (!hasPermission()) {
    return (
      <Result
        status="403"
        title="403 - Доступ запрещен"
        subTitle={
          requireAdmin 
            ? "У вас нет административных прав для доступа к этой странице"
            : "У вас нет прав доступа к этой странице"
        }
        icon={requireAdmin ? <LockOutlined /> : <UserOutlined />}
        extra={
          <div>
            <Button 
              type="primary" 
              onClick={() => window.history.back()}
              style={{ marginRight: 8 }}
            >
              Назад
            </Button>
            <Button onClick={() => window.location.href = '/'}>
              На главную
            </Button>
          </div>
        }
      />
    );
  }

  // Если все проверки пройдены
  return children;
};

// HOC для админских маршрутов
export const AdminRoute = ({ children, ...props }) => (
  <PrivateRoute requireAdmin={true} {...props}>
    {children}
  </PrivateRoute>
);

export default PrivateRoute;
