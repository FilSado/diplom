import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ConfigProvider, message, App as AntApp, Spin } from 'antd';
import ruRU from 'antd/locale/ru_RU';

import 'antd/dist/reset.css';
import './styles/components.css';
import './App.css';

import { checkAuthStatus, selectIsInitialized } from './store/authSlice';

import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';

import MainPage from './pages/MainPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StoragePage from './pages/StoragePage';
import AdminPage from './pages/AdminPage';
import NotAuthorizedPage from './pages/NotAuthorizedPage.jsx';

const theme = {
  token: {
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1890ff',
    borderRadius: 6,
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f5f5f5',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
    fontSize: 14,
    lineHeight: 1.5714285714285714,
  },
  components: {
    Layout: {
      headerBg: '#001529',
      headerColor: '#ffffff',
      headerHeight: 64,
    },
    Menu: {
      darkItemBg: 'transparent',
      darkItemColor: '#ffffff',
      darkItemHoverBg: 'rgba(255, 255, 255, 0.1)',
      darkItemSelectedBg: '#1890ff',
      darkItemSelectedColor: '#ffffff',
    },
    Button: {
      borderRadius: 6,
      controlHeight: 32,
    },
    Input: {
      borderRadius: 6,
      controlHeight: 32,
    },
    Card: {
      borderRadius: 8,
      headerBg: '#fafafa',
    },
    Upload: {
      colorPrimary: '#1890ff',
    },
    Table: {
      headerBg: '#fafafa',
      headerColor: 'rgba(0, 0, 0, 0.85)',
      rowHoverBg: '#f5f5f5',
    },
  },
  algorithm: [],
};

message.config({
  top: 100,
  duration: 3,
  maxCount: 3,
  rtl: false,
});

function App() {
  const dispatch = useDispatch();
  const isInitialized = useSelector(selectIsInitialized);

  useEffect(() => {
    dispatch(checkAuthStatus());
  }, [dispatch]);

  if (!isInitialized) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f5f5f5',
        }}
      >
        <Spin size="large" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div>Загрузка приложения...</div>
        </Spin>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ConfigProvider locale={ruRU} theme={theme}>
        <AntApp>
          <BrowserRouter 
            future={{ 
              v7_startTransition: true, 
              v7_relativeSplatPath: true 
            }}
          >
            <div
              className="App"
              style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#f5f5f5',
              }}
            >
              <Navbar />

              <main
                style={{
                  flex: 1,
                  minHeight: 'calc(100vh - 64px)',
                  backgroundColor: '#f5f5f5',
                  position: 'relative',
                }}
              >
                <Routes>
                  {/* Публичные маршруты */}
                  <Route path="/" element={<MainPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />

                  {/* Защищенные маршруты */}
                  <Route
                    path="/storage"
                    element={
                      <PrivateRoute>
                        <StoragePage />
                      </PrivateRoute>
                    }
                  />

                  {/* Административные маршруты */}
                  <Route
                    path="/admin"
                    element={
                      <PrivateRoute requireAdmin>
                        <AdminPage />
                      </PrivateRoute>
                    }
                  />

                  {/* Неавторизован */}
                  <Route path="/not-authorized" element={<NotAuthorizedPage />} />

                  {/* 404 */}
                  <Route
                    path="*"
                    element={
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          minHeight: 'calc(100vh - 64px)',
                          flexDirection: 'column',
                          backgroundColor: '#f5f5f5',
                          textAlign: 'center',
                          padding: '24px',
                        }}
                      >
                        <h1 style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }}>
                          404
                        </h1>
                        <h2 style={{ marginBottom: '16px' }}>Страница не найдена</h2>
                        <p style={{ color: '#666', marginBottom: '24px' }}>
                          Запрашиваемая страница не существует
                        </p>
                        <button
                          onClick={() => window.history.back()}
                          style={{
                            background: '#1890ff',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          Назад
                        </button>
                      </div>
                    }
                  />
                </Routes>
              </main>
            </div>
          </BrowserRouter>
        </AntApp>
      </ConfigProvider>
    </ErrorBoundary>
  );
}

export default App;
