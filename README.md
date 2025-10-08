# 🏆 Облачное хранилище My Cloud — Дипломный проект

## 📋 Описание проекта

**My Cloud** — современное облачное хранилище файлов с веб-интерфейсом. Позволяет пользователям:
- Регистрироваться и входить в систему с валидацией форм
- Загружать файлы (drag & drop, множественная загрузка)
- Управлять файлами: просмотр, скачивание, переименование, удаление
- Добавлять и редактировать комментарии к файлам
- Генерировать публичные ссылки для обмена
- Использовать административный интерфейс для управления пользователями
- Работать в зависимости от роли (пользователь, администратор)
- Пользоваться адаптивным дизайном на любых устройствах

## 🛠 Технологический стек

### Frontend
- React 18.2, Redux Toolkit, React Router Dom 6
- Ant Design 5, Axios
- Jest + React Testing Library

### Backend  
- Django 5.2 + Django REST Framework
- PostgreSQL 15+, JWT (djangorestframework-simplejwt)
- Django CORS Headers, Gunicorn
- pytest + pytest-django

### Инфраструктура и деплой
- Docker + Docker Compose
- Nginx (reverse proxy)
- REG.RU хостинг (IP 83.166.245.17)

## 🚀 Полная инструкция по развертыванию

### Предварительные требования:
- Ubuntu 20.04+ / Debian 10+
- Python 3.10+, Node.js 18+
- PostgreSQL 15+
- Docker >= 20.10, Docker Compose >= 2.0
- 2GB RAM, 20GB диск

### Шаг 1: Подготовка сервера

Подключение к серверу
ssh root@83.166.245.17

Обновление системы
sudo apt update && sudo apt upgrade -y

Установка зависимостей
sudo apt install -y git python3-pip postgresql postgresql-contrib nginx

### Шаг 2: Настройка PostgreSQL

Создание базы данных
sudo -u postgres psql

CREATE DATABASE mycloud_production;
CREATE USER mycloud_user WITH PASSWORD 'NewStrongPassword123';
GRANT ALL PRIVILEGES ON DATABASE mycloud_production TO mycloud_user;
ALTER USER mycloud_user CREATEDB;
\q

### Шаг 3: Клонирование проекта

Создание директории
sudo mkdir -p /opt/diplom
sudo chown -R $USER:$USER /opt/diplom
cd /opt/diplom

Клонирование репозитория (или загрузка через SCP)
git clone <your-repo-url> .

### Шаг 4: Сборка Frontend

**На локальной машине (Windows):**

cd C:\Users\Евгения\diplom\mycloudfrontend

Установка зависимостей
npm install

Production сборка
$env:REACT_APP_API_URL="http://83.166.245.17/api"
npm run build

Загрузка на сервер
scp -r build* root@83.166.245.17:/opt/diplom/MyCloudBackend/frontend_build/


### Шаг 5: Настройка Backend

cd /opt/diplom/MyCloudBackend

Создание .env файла
nano .env

(Скопируйте содержимое из MyCloudBackend/README.md раздел 4)
Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

Запуск Docker Compose
docker-compose build --no-cache
docker-compose up -d

Миграции
docker-compose exec web python manage.py migrate

Создание суперпользователя
docker-compose exec web python manage.py createsuperuser

Username: admin
Email: admin@mycloud.com
Password: AdminPass123!
Сбор статики
docker-compose exec web python manage.py collectstatic --noinput

Установка прав
chmod -R 755 frontend_build/



### Шаг 6: Проверка работоспособности

Проверка статуса контейнеров
docker-compose ps

Проверка логов
docker-compose logs -f nginx
docker-compose logs -f web

Проверка доступности сайта
curl http://83.166.245.17


## 🎯 Результат развертывания

**Сайт работает на:** http://83.166.245.17

- **Основной сайт:** http://83.166.245.17
- **Админ панель:** http://83.166.245.17/admin/
- **API:** http://83.166.245.17/api/

### Тестовые учетные записи:
- **Администратор:** admin / AdminPass123!
- **Пользователь:** demo / DemoPass123! (создайте через интерфейс)

## ✅ Реализованная функциональность

### Frontend:
- [x] SPA на React + Redux + React Router
- [x] Регистрация с валидацией (логин: 4-20 символов, латиница; email; пароль: 6+ символов, заглавная буква, цифра, спецсимвол)
- [x] Аутентификация (логин/пароль, JWT)
- [x] Навигация с защищенными маршрутами
- [x] Административный интерфейс (список пользователей, удаление, изменение прав)
- [x] Файловое хранилище (загрузка, скачивание, удаление, переименование)
- [x] Комментарии к файлам (добавление, редактирование)
- [x] Публичные ссылки на файлы (генерация, копирование)
- [x] Адаптивный дизайн (мобильные/десктоп устройства)
- [x] Обработка ошибок и loading states
- [x] Валидация форм на фронтенде

### Backend:
- [x] Django 5.2 + DRF + PostgreSQL
- [x] JWT авторизация (access/refresh токены)
- [x] REST API (JSON формат)
- [x] Регистрация с валидацией полей
- [x] Управление пользователями (CRUD операции)
- [x] Файловое хранилище (загрузка/скачивание/удаление/переименование)
- [x] Публичные ссылки (обезличенные UUID токены)
- [x] Права доступа (администратор/пользователь)
- [x] Логирование всех операций
- [x] Проверка прав доступа на API уровне
- [x] Миграции БД

### Деплой:
- [x] Развернуто на REG.RU (83.166.245.17)
- [x] Docker + Docker Compose
- [x] Nginx (reverse proxy)
- [x] Gunicorn (WSGI сервер)
- [x] PostgreSQL (БД в контейнере)

## 🔧 Управление проектом

### Просмотр логов:
docker-compose logs -f web # Backend логи
docker-compose logs -f nginx # Nginx логи
docker-compose logs -f db # PostgreSQL логи

### Перезапуск сервисов:
docker-compose restart # Перезапуск всех сервисов
docker-compose restart web # Только backend
docker-compose restart nginx # Только nginx



### Остановка и запуск:
docker-compose down # Остановка всех контейнеров
docker-compose up -d # Запуск в фоновом режиме


### Резервное копирование:
База данных
docker-compose exec db pg_dump -U mycloud_user mycloud_production > backup_$(date +%Y%m%d).sql

Файлы пользователей
tar -czf media_backup_$(date +%Y%m%d).tar.gz media/



### Восстановление из бэкапа:
База данных
cat backup_20251008.sql | docker-compose exec -T db psql -U mycloud_user mycloud_production

Файлы
tar -xzf media_backup_20251008.tar.gz



## 🧪 Тестирование

Backend тесты
docker-compose exec web pytest

Проверка безопасности Django
docker-compose exec web python manage.py check --deploy


## 🛠️ Troubleshooting

### Проблема: Сайт недоступен
Проверка статуса контейнеров
docker-compose ps

Проверка логов Nginx
docker-compose logs nginx | tail -50

Проверка портов
sudo netstat -tlnp | grep :80



### Проблема: Ошибки базы данных
Проверка подключения к БД
docker-compose exec web python manage.py check --database default

Логи PostgreSQL
docker-compose logs db | tail -50


### Проблема: Статические файлы не загружаются
Пересборка статики
docker-compose exec web python manage.py collectstatic --noinput -v 2

Проверка Nginx конфигурации
docker-compose exec nginx nginx -t
docker-compose restart nginx



## 📞 Контакты и поддержка

**Разработчик:** Евгения Садовникова  
**Email:** evgenia.sadovnikova@mail.ru  
**Дипломный проект:** Fullstack-разработчик на Python (Нетология)

### Полезные ссылки:
- **Django документация:** https://docs.djangoproject.com/
- **React документация:** https://react.dev/
- **Docker документация:** https://docs.docker.com/

---

**Подробные инструкции по развертыванию каждого компонента смотрите в:**
- `MyCloudBackend/README.md` — Backend инструкции
- `mycloudfrontend/README.md` — Frontend инструкции

---

**© 2025 My Cloud. Дипломный проект готов к production использованию!**