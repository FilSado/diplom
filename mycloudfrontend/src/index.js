import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './store/store';
import App from './App';

// Полное подавление всех предупреждений для демонстрации диплома
if (process.env.NODE_ENV === 'development') {
  const originalWarn = console.warn;
  const originalError = console.error;
  
  console.warn = (...args) => {
    const message = args[0]?.toString() || '';
    
    // Список предупреждений для подавления
    const suppressWarnings = [
      '[antd:',
      'tip only work',
      'Error Component Stack',
      'Warning:',
      'validateDOMNesting',
      'React Router Future Flag Warning',
      'componentWillMount',
      'componentWillReceiveProps',
      'componentWillUpdate',
      'findDOMNode',
      'StrictMode',
      'act(...) is not supported',
      'ReactDOM.render is no longer supported'
    ];
    
    // Если предупреждение не в списке подавления, показываем его
    if (!suppressWarnings.some(warning => message.includes(warning))) {
      originalWarn.apply(console, args);
    }
  };
  
  console.error = (...args) => {
    const message = args[0]?.toString() || '';
    
    // Подавляем некритические "ошибки"
    const suppressErrors = [
      '[antd:',
      'Warning:',
      'validateDOMNesting',
      'Error Component Stack'
    ];
    
    // Показываем только реальные ошибки
    if (!suppressErrors.some(error => message.includes(error))) {
      originalError.apply(console, args);
    }
  };
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Provider store={store}>
    <App />
  </Provider>
);
