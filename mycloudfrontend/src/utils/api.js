// Базовый URL API - ИСПРАВЛЕНО!
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://83.166.245.17:8000/api';

// Флаг для предотвращения множественных refresh-запросов
let isRefreshing = false;
let refreshPromise = null;

// Вспомогательная функция для обработки ответов
async function handleResponse(response) {
  if (!response.ok) {
    let errorMessage = 'Произошла ошибка';
    try {
      const errorData = await response.json();
      if (typeof errorData.detail === 'string') {
        errorMessage = errorData.detail;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      } else if (typeof errorData === 'object') {
        const errors = [];
        for (const [, messages] of Object.entries(errorData)) {
          if (Array.isArray(messages)) {
            errors.push(...messages);
          } else if (typeof messages === 'string') {
            errors.push(messages);
          }
        }
        if (errors.length > 0) {
          errorMessage = errors.join('. ');
        }
      }
    } catch {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response;
}

// Токены в localStorage - ИСПРАВЛЕНО!
function getTokens() {
  try {
    // Поддерживаем оба формата токенов
    const tokens = JSON.parse(localStorage.getItem('tokens'));
    if (tokens) return tokens;
    
    // Fallback для старого формата
    const access = localStorage.getItem('access_token');
    const refresh = localStorage.getItem('refresh_token');
    if (access && refresh) {
      return { access, refresh };
    }
    
    return null;
  } catch {
    return null;
  }
}

function setTokens(tokens) {
  localStorage.setItem('tokens', JSON.stringify(tokens));
  // Также сохраняем в старом формате для совместимости
  localStorage.setItem('access_token', tokens.access);
  localStorage.setItem('refresh_token', tokens.refresh);
}

function removeTokens() {
  localStorage.removeItem('tokens');
  localStorage.removeItem('user');
  // Удаляем и старый формат
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

// =================
// АУТЕНТИФИКАЦИЯ
// =================

// Вход в систему
export async function loginApi({ username, password }) {
  const response = await fetch(`${API_BASE_URL}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    credentials: 'include',
  });
  const data = await handleResponse(response);
  if (data.access && data.refresh) {
    setTokens({ access: data.access, refresh: data.refresh });
    if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
  }
  return data;
}

// Регистрация пользователя
export async function registerApi(userData) {
  const response = await fetch(`${API_BASE_URL}/auth/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  const data = await handleResponse(response);
  if (data.access && data.refresh) {
    setTokens({ access: data.access, refresh: data.refresh });
    if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
  }
  return data;
}

// Выход из системы
export async function logoutApi() {
  const tokens = getTokens();
  try {
    await fetch(`${API_BASE_URL}/auth/logout/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(tokens?.access && { Authorization: `Bearer ${tokens.access}` }),
      },
      body: JSON.stringify({ refresh: tokens?.refresh }),
      credentials: 'include',
    });
  } catch (error) {
    console.warn('Ошибка при logout на сервере:', error);
  } finally {
    removeTokens();
    isRefreshing = false;
    refreshPromise = null;
  }
}

// Обновление токена
export async function refreshTokenApi() {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }
  const tokens = getTokens();
  if (!tokens?.refresh) {
    throw new Error('Refresh token отсутствует');
  }
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: tokens.refresh }),
        credentials: 'include',
      });
      const data = await handleResponse(response);
      const newTokens = {
        access: data.access,
        refresh: data.refresh || tokens.refresh,
      };
      setTokens(newTokens);
      return newTokens;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

// Получение текущего пользователя
export async function getCurrentUserApi() {
  return authorizedFetch('/auth/user/me/');
}

// =================
// РАБОТА С ФАЙЛАМИ - ИСПРАВЛЕНО!
// =================

// Список файлов
export async function getFilesApi(userId = null) {
  const url = userId ? `/files/?user_id=${userId}` : '/files/';
  return authorizedFetch(url);
}

// Загрузка файла - ОСНОВНАЯ ПРОБЛЕМА ИСПРАВЛЕНА!
export async function uploadFileApi({ file, comment = '', onProgress }) {
  const tokens = getTokens();
  if (!tokens?.access) throw new Error('Необходима авторизация');
  
  const formData = new FormData();
  formData.append('file', file);
  if (comment) formData.append('comment', comment);
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress({ 
          loaded: e.loaded, 
          total: e.total, 
          percent: Math.round((e.loaded / e.total) * 100) 
        });
      }
    };
    
    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { 
            resolve(JSON.parse(xhr.responseText)); 
          } catch { 
            reject(new Error('Ошибка парсинга ответа сервера')); 
          }
        } else {
          try { 
            const err = JSON.parse(xhr.responseText); 
            reject(new Error(err.detail || err.error || 'Ошибка загрузки файла')); 
          } catch { 
            reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`)); 
          }
        }
      }
    };
    
    xhr.onerror = () => reject(new Error('Ошибка сети при загрузке файла'));
    xhr.ontimeout = () => reject(new Error('Превышено время ожидания загрузки файла'));
    xhr.onabort = () => reject(new Error('Загрузка файла отменена'));
    
    // ИСПРАВЛЕНО! Убираем дублирование /api
    xhr.open('POST', `${API_BASE_URL}/files/upload/`);
    xhr.setRequestHeader('Authorization', `Bearer ${tokens.access}`);
    xhr.timeout = 5 * 60 * 1000;
    xhr.send(formData);
  });
}

// Удаление файла
export async function deleteFileApi(fileId) {
  return authorizedFetch(`/files/${fileId}/`, { method: 'DELETE' });
}

// Переименование файла
export async function renameFileApi(fileId, newName) {
  return authorizedFetch(`/files/${fileId}/rename/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newName }) 
  });
}

// Обновление комментария
export async function updateFileCommentApi(fileId, comment) {
  return authorizedFetch(`/files/${fileId}/comment/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment })
  });
}

// Скачивание файла
export async function downloadFileApi(fileId) {
  const tokens = getTokens();
  if (!tokens?.access) throw new Error('Необходима авторизация');
  
  const response = await fetch(`${API_BASE_URL}/files/${fileId}/download/`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokens.access}` }
  });
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Ошибка при скачивании файла');
  }
  
  return await response.blob();
}

// Копирование публичной ссылки
export async function copyFileLinkApi(fileId) {
  try {
    return await authorizedFetch(`/files/${fileId}/copy-link/`, { method: 'POST' });
  } catch (err) {
    throw new Error(err.message || 'Ошибка при получении ссылки');
  }
}

// =================
// АДМИНСКИЕ ФУНКЦИИ
// =================

export async function getAdminUsersApi() {
  return authorizedFetch('/admin/users/');
}

export async function updateAdminUserApi(id, data) {
  return authorizedFetch(`/admin/users/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

export async function deleteAdminUserApi(id) {
  return authorizedFetch(`/admin/users/${id}/delete/`, { method: 'DELETE' });
}

export async function getAdminUserFilesApi(id) {
  return authorizedFetch(`/admin/users/${id}/files/`);
}

export async function getAdminUserStatsApi(id) {
  return authorizedFetch(`/admin/users/${id}/stats/`);
}

export async function toggleUserStatusApi(id, isActive) {
  return authorizedFetch(`/admin/users/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active: isActive })
  });
}

// =================
// УТИЛИТЫ - ИСПРАВЛЕНО!
// =================

export async function authorizedFetch(url, options = {}) {
  const tokens = getTokens();
  let headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...(tokens?.access && { Authorization: `Bearer ${tokens.access}` })
  };

  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  // ИСПРАВЛЕНО! Убираем дублирование слеша
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  let response = await fetch(fullUrl, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (response.status === 401 && tokens?.refresh && !isRefreshing) {
    try {
      const newTokens = await refreshTokenApi();
      headers.Authorization = `Bearer ${newTokens.access}`;
      response = await fetch(fullUrl, {
        ...options,
        headers,
        credentials: 'include'
      });
    } catch {
      removeTokens();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:logout', {
          detail: 'Сессия истекла, пожалуйста войдите снова',
        }));
      }
      throw new Error('Сессия истекла, пожалуйста войдите снова');
    }
  }

  return handleResponse(response);
}

export async function healthCheckApi() {
  const response = await fetch(`${API_BASE_URL}/health/`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  return handleResponse(response);
}

export async function getSystemInfoApi() {
  return authorizedFetch('/system/info/');
}

export const getTokensUtil = getTokens;
export const setTokensUtil = setTokens;
export const removeTokensUtil = removeTokens;

// Исправление ESLint предупреждения
const apiConfig = { API_BASE_URL };
export default apiConfig;