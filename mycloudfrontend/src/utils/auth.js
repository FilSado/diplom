/**
 * Утилиты для работы с авторизацией и правами доступа
 * Модуль содержит функции для проверки прав пользователей в приложении My Cloud
 */

/**
 * Проверяет, имеет ли пользователь доступ к определенным ролям
 * @param {{ role: string, is_staff: boolean, is_superuser: boolean, id: number }} user - Объект пользователя
 * @param {string[]} allowedRoles - Массив разрешенных ролей 
 * @returns {boolean} - Есть ли у пользователя доступ
 */
export function hasAccess(user, allowedRoles) {
  // Проверяем что пользователь существует
  if (!user) return false;
  
  // Суперпользователь имеет доступ ко всему
  if (user.is_superuser) return true;
  
  // Если требуется роль админа и пользователь - staff, разрешаем доступ
  if (allowedRoles.includes('admin') && user.is_staff) return true;
  
  // ИСПРАВЛЕНО: Проверяем роль пользователя среди разрешенных (с fallback)
  if (user.role && allowedRoles.includes(user.role)) return true;
  
  // Если роль не указана, для обычных пользователей даем доступ к user-роли
  if (allowedRoles.includes('user')) return true;
  
  return false;
}

/**
 * Проверяет является ли пользователь владельцем ресурса
 * @param {Object} user - Объект пользователя
 * @param {number|string} ownerId - ID владельца ресурса
 * @returns {boolean} - Является ли владельцем
 */
export function isOwner(user, ownerId) {
  if (!user || !ownerId) return false;
  return user.id === ownerId || user.id === parseInt(ownerId);
}

/**
 * Проверяет может ли пользователь редактировать ресурс
 * @param {Object} user - Объект пользователя
 * @param {number|string} ownerId - ID владельца ресурса
 * @returns {boolean} - Может ли редактировать
 */
export function canEdit(user, ownerId) {
  return hasAccess(user, ['admin']) || isOwner(user, ownerId);
}

/**
 * Получает роль пользователя в читаемом виде
 * @param {Object} user - Объект пользователя
 * @returns {string} - Название роли на русском
 */
export function getUserRoleDisplay(user) {
  if (!user) return 'Гость';
  
  if (user.is_superuser) return 'Суперпользователь';
  if (user.is_staff || user.role === 'admin') return 'Администратор';
  
  return 'Пользователь';
}

/**
 * Проверяет авторизован ли пользователь в системе
 * @param {Object} user - Объект пользователя
 * @param {boolean} isAuthenticated - Флаг авторизации из Redux
 * @returns {boolean} - Авторизован ли
 */
export function isLoggedIn(user, isAuthenticated) {
  return !!(user && isAuthenticated);
}

/**
 * Проверяет истек ли JWT токен
 * @param {number} tokenExpiry - Время истечения токена в миллисекундах
 * @returns {boolean} - Истек ли токен
 */
export function isTokenExpired(tokenExpiry) {
  if (!tokenExpiry) return true;
  return Date.now() >= tokenExpiry;
}

/**
 * Проверяет нужно ли обновить JWT токен
 * @param {number} tokenExpiry - Время истечения токена в миллисекундах
 * @param {number} refreshBuffer - Буфер времени для обновления (по умолчанию 5 минут)
 * @returns {boolean} - Нужно ли обновить токен
 */
export function shouldRefreshToken(tokenExpiry, refreshBuffer = 5 * 60 * 1000) {
  if (!tokenExpiry) return true;
  return Date.now() >= (tokenExpiry - refreshBuffer);
}

/**
 * Проверяет является ли пользователь администратором
 * @param {Object} user - Объект пользователя
 * @returns {boolean} - Является ли администратором
 */
export function isAdmin(user) {
  return hasAccess(user, ['admin']);
}

/**
 * Получает инициалы пользователя для аватара
 * @param {Object} user - Объект пользователя
 * @returns {string} - Инициалы пользователя
 */
export function getUserInitials(user) {
  if (!user) return '?';
  
  if (user.first_name && user.last_name) {
    return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
  }
  
  if (user.username) {
    return user.username.slice(0, 2).toUpperCase();
  }
  
  return '?';
}

/**
 * Форматирует полное имя пользователя
 * @param {Object} user - Объект пользователя
 * @returns {string} - Полное имя или username
 */
export function getFullName(user) {
  if (!user) return 'Неизвестный пользователь';
  
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  
  if (user.first_name) {
    return user.first_name;
  }
  
  return user.username || 'Пользователь';
}

/**
 * Проверяет валидность структуры пользователя
 * @param {Object} user - Объект пользователя для проверки
 * @returns {boolean} - Валиден ли объект пользователя
 */
export function isValidUser(user) {
  return !!(
    user && 
    typeof user === 'object' &&
    user.id &&
    user.username
  );
}

// Экспорт по умолчанию для удобства
const authUtils = {
  hasAccess,
  isOwner,
  canEdit,
  getUserRoleDisplay,
  isLoggedIn,
  isTokenExpired,
  shouldRefreshToken,
  isAdmin,
  getUserInitials,
  getFullName,
  isValidUser
};

export default authUtils;
