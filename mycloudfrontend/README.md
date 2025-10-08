# ⚛️ MyCloud Frontend - React SPA

## 📋 Описание
Интерфейс облачного хранилища My Cloud на React 18 + Redux Toolkit + Ant Design.

## 🛠 Технологический стек
- React 18.2, React Router Dom 6  
- Redux Toolkit для управления состоянием
- Ant Design 5 для UI компонентов
- Axios для HTTP запросов
- Jest + React Testing Library для тестирования

## 🚀 Разработка

### Установка зависимостей:

cd mycloudfrontend
npm install



### Настройка .env:

cp .env.example .env


REACT_APP_API_URL=http://127.0.0.1:8000/api
REACT_APP_MEDIA_URL=http://127.0.0.1:8000/media
GENERATE_SOURCEMAP=false


### Запуск в режиме разработки:

npm start


Откроется http://localhost:3000

## 📦 Production сборка

### Для локального тестирования:

Development build
npm run build

Для production с API на REG.RU:
REACT_APP_API_URL=http://83.166.245.17/api npm run build

### Проверка сборки:

Просмотр размера bundle
npm run analyze

Локальный сервер для тестирования build
npx serve -s build -l 3000

### ✅ Интеграция с Django:

После сборки React приложения:
1. Скопировать build в Django проект
cp -r build ../MyCloudBackend/frontend_build

2. На сервере установить права
chmod -R 755 /opt/diplom/MyCloudBackend/frontend_build

3. Перезапустить Nginx
docker-compose restart nginx

**Результат:** React приложение будет доступно на http://83.166.245.17

## 🧪 Тестирование

### Запуск тестов:

Все тесты
npm test

Тесты с покрытием
npm run test:coverage

Конкретные компоненты
npm test -- --testPathPattern=Login
npm test -- --testPathPattern=FileUpload


### Линтинг:

Проверка кода
npm run lint

Автоисправление
npm run lint:fix

## 🎨 Основные компоненты

### Авторизация
- `LoginForm` - форма входа с валидацией
- `RegisterForm` - регистрация пользователей
- `ProtectedRoute` - защищенные маршруты

### Файлы
- `FileUpload` - загрузка файлов (drag & drop)
- `FileList` - список файлов с фильтрацией
- `FileActions` - действия с файлами
- `FilePreview` - предпросмотр файлов

### UI
- `Loading` - индикаторы загрузки
- `ErrorBoundary` - обработка ошибок
- `Pagination` - пагинация списков

## 🔧 Конфигурация

### API клиент (src/utils/api.js):

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';

const apiClient = axios.create({
baseURL: API_BASE_URL,
headers: {
'Content-Type': 'application/json',
},
});


### Redux store (src/store/index.js):

export const store = configureStore({
reducer: {
auth: authSlice.reducer,
files: filesSlice.reducer,
},
middleware: (getDefaultMiddleware) =>
getDefaultMiddleware({
serializableCheck: {
ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
},
}),
});



## 📱 Адаптивность

Приложение адаптировано для:
- **Desktop:** 1200px+
- **Tablet:** 768px - 1199px  
- **Mobile:** 320px - 767px

Используются breakpoints из Ant Design:
- `xs`: < 576px
- `sm`: ≥ 576px
- `md`: ≥ 768px
- `lg`: ≥ 992px
- `xl`: ≥ 1200px

## 🚀 Деплой

### Для REG.RU production:

1. Установить переменные для production
export REACT_APP_API_URL=http://83.166.245.17:8000/api
export REACT_APP_MEDIA_URL=http://83.166.245.17:8000/media

2. Создать production build
npm run build

3. Скопировать в Django проект
cp -r build ../MyCloudBackend/frontend_build



### Интеграция с Django:

Build автоматически интегрируется с Django через:
- Django `STATICFILES_DIRS` настройки
- Nginx конфигурацию для статических файлов
- WhiteNoise для отдачи React приложения

## 🐞 Отладка

### Полезные команды:

Анализ bundle размера
npm run analyze

Проверка зависимостей на уязвимости
npm audit

Обновление зависимостей
npm update

Очистка node_modules
rm -rf node_modules package-lock.json
npm install



### Частые проблемы:

**CORS ошибки:**
- Проверьте `REACT_APP_API_URL` в .env
- Убедитесь что Django CORS настроен правильно

**Не загружаются файлы:**
- Проверьте `REACT_APP_MEDIA_URL`
- Убедитесь что Nginx отдает `/media/` правильно

**Ошибки авторизации:**
- Проверьте localStorage на наличие токенов
- Убедитесь что JWT токены действительны

## 📞 Поддержка

**Email:** evgenia.sadovnikova@mail.ru  
**React документация:** https://react.dev/  
**Ant Design:** https://ant.design/  
**Redux Toolkit:** https://redux-toolkit.js.org/