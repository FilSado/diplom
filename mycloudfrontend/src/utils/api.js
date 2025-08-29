const API_BASE_URL = 'http://83.166.245.17/api';

export async function loginApi({ login, password }) {
  const response = await fetch(`${API_BASE_URL}/token/`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ username: login, password }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Ошибка при входе');
  }

  return response.json(); // { access, refresh }
}

// Функция для запросов с токеном авторизации
export async function authorizedFetch(url, options = {}) {
  const tokens = JSON.parse(localStorage.getItem('tokens'));
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (tokens?.access) {
    headers['Authorization'] = `Bearer ${tokens.access}`;
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'API ошибка');
  }

  return response.json();
}
