# 🐍 MyCloud Backend - Django REST API

## 📋 Описание
Backend часть облачного хранилища My Cloud на Django 5.2 + DRF с Docker деплоем.

## 🛠 Технологический стек
- Django 5.2, Django REST Framework  
- PostgreSQL 15+, JWT Authentication
- Docker + Docker Compose
- Nginx, Gunicorn
- pytest для тестирования

## 📡 Подробная инструкция деплоя на REG.RU

### 1️⃣ Настройка PostgreSQL

Установка PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

Создание базы данных
sudo -u postgres psql

text
undefined
CREATE DATABASE mycloud_production;
CREATE USER mycloud_user WITH PASSWORD 'NewStrongPassword123';
GRANT ALL PRIVILEGES ON DATABASE mycloud_production TO mycloud_user;
ALTER USER mycloud_user CREATEDB;
\q

text

### 2️⃣ Установка Docker

Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

Проверка установки
docker --version
docker-compose --version

text

### 3️⃣ Подготовка проекта

Создание директорий
sudo mkdir -p /opt/mycloud
sudo chown -R $USER:$USER /opt/mycloud
cd /opt/mycloud

Копирование React build
cp -r mycloudfrontend/build MyCloudBackend/frontend_build

Создание необходимых директорий
mkdir -p MyCloudBackend/{logs,ssl,media,staticfiles}

text

### 4️⃣ Настройка .env файла

nano MyCloudBackend/.env

text
undefined
Django Core Settings
SECRET_KEY=django-insecure-change-this-in-production-50-chars-minimum
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,83.166.245.17

Database Settings
DB_NAME=mycloud_production
DB_USER=mycloud_user
DB_PASSWORD=NewStrongPassword123
DB_HOST=db
DB_PORT=5432

CORS Settings
CORS_ALLOWED_ORIGINS=http://83.166.245.17,https://83.166.245.17
CORS_ALLOW_CREDENTIALS=True

Static Files
STATIC_URL=/static/
MEDIA_URL=/media/
STATIC_ROOT=/app/staticfiles
MEDIA_ROOT=/app/media

Security Settings
SECURE_BROWSER_XSS_FILTER=True
SECURE_CONTENT_TYPE_NOSNIFF=True
X_FRAME_OPTIONS=DENY

text

**Генерация SECRET_KEY:**
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

text

### 5️⃣ Запуск Docker

cd /opt/mycloud/MyCloudBackend

Сборка и запуск
docker-compose build --no-cache
docker-compose up -d

Проверка статуса
docker-compose ps

text

### 6️⃣ Настройка Django

Миграции
docker-compose exec web python manage.py migrate

Создание суперпользователя
docker-compose exec web python manage.py createsuperuser

Сбор статических файлов
docker-compose exec web python manage.py collectstatic --noinput

Создание демо пользователей
docker-compose exec web python manage.py shell -c "
from django.contrib.auth.models import User;
User.objects.create_user('demo', 'demo@example.com', 'DemoPass123!');
User.objects.create_user('testuser', 'test@example.com', 'TestPass123!');
print('Demo users created')
"

text

## 🔧 Управление

### Основные команды:

Просмотр логов
docker-compose logs -f web
docker-compose logs -f nginx
docker-compose logs -f db

Перезапуск сервисов
docker-compose restart web
docker-compose restart nginx

Остановка всех сервисов
docker-compose down

text

### Резервное копирование:

Бэкап БД
docker-compose exec db pg_dump -U mycloud_user mycloud_production > backup_$(date +%Y%m%d_%H%M%S).sql

Бэкап файлов
tar -czf media_backup_$(date +%Y%m%d_%H%M%S).tar.gz media/

text

## 🧪 Тестирование

Запуск тестов
docker-compose exec web pytest

Тесты с покрытием
docker-compose exec web pytest --cov=mycloud

Проверка безопасности
docker-compose exec web python manage.py check --deploy

text

## 🛠️ Troubleshooting

### Проблема: Сайт недоступен
Проверка статуса
docker-compose ps

Проверка логов
docker-compose logs nginx | tail -50

Проверка портов
sudo netstat -tlnp | grep :80

text

### Проблема: Ошибки базы данных
Проверка подключения к БД
docker-compose exec web python manage.py check --database default

Логи PostgreSQL
docker-compose logs db | tail -50

text

### Проблема: Статические файлы не загружаются
Пересборка статики
docker-compose exec web python manage.py collectstatic --noinput -v 2

Проверка Nginx конфигурации
docker-compose exec nginx nginx -t
docker-compose restart nginx

text

## 🎯 API Endpoints

- **Авторизация:** `/api/auth/login/`, `/api/auth/register/`
- **Файлы:** `/api/files/`, `/api/files/upload/`
- **Пользователи:** `/api/users/`
- **Админка:** `/admin/`

## 📞 Поддержка

**Email:** evgenia.sadovnikova@mail.ru  
**Документация Django:** https://docs.djangoproject.com/  
**Docker документация:** https://docs.docker.com/