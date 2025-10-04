import React from 'react';
import { Result, Button, Typography } from 'antd';

const { Paragraph, Text } = Typography;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Обновляем состояние, чтобы показать fallback UI при следующем рендере
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Сохраняем детали ошибки в состоянии
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Логируем ошибку для отладки
    console.error('ErrorBoundary поймал ошибку:', error, errorInfo);

    // Здесь можно отправить ошибку в сервис мониторинга (например, Sentry)
    // sendErrorToMonitoringService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <Result
            status="500"
            title="Что-то пошло не так"
            subTitle="Произошла непредвиденная ошибка в приложении. Попробуйте перезагрузить страницу или обратитесь к администратору."
            extra={[
              <Button 
                type="primary" 
                key="reload"
                onClick={() => window.location.reload()}
              >
                Перезагрузить страницу
              </Button>,
              <Button 
                key="home"
                onClick={() => window.location.href = '/'}
              >
                На главную
              </Button>
            ]}
          >
            {/* Детали ошибки (только в development режиме) */}
            {process.env.NODE_ENV === 'development' && (
              <div style={{ 
                textAlign: 'left', 
                background: '#f5f5f5', 
                padding: '16px', 
                borderRadius: '6px',
                marginTop: '24px',
                maxWidth: '800px',
                margin: '24px auto 0'
              }}>
                <Text strong>Детали ошибки (только в режиме разработки):</Text>
                <Paragraph 
                  code 
                  copyable
                  style={{ 
                    marginTop: '8px',
                    whiteSpace: 'pre-wrap',
                    fontSize: '12px'
                  }}
                >
                  {this.state.error && this.state.error.toString()}
                </Paragraph>
                
                {this.state.errorInfo && (
                  <>
                    <Text strong>Stack trace:</Text>
                    <Paragraph 
                      code
                      style={{ 
                        marginTop: '8px',
                        whiteSpace: 'pre-wrap',
                        fontSize: '11px',
                        maxHeight: '200px',
                        overflow: 'auto'
                      }}
                    >
                      {this.state.errorInfo.componentStack}
                    </Paragraph>
                  </>
                )}
              </div>
            )}
          </Result>
        </div>
      );
    }

    // Если ошибок нет, рендерим дочерние компоненты как обычно
    return this.props.children;
  }
}

export default ErrorBoundary;
