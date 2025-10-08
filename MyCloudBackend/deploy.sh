#!/bin/bash

set -e  # Остановка при ошибке

echo "🚀 ========================================="
echo "   ДЕПЛОЙ MYCLOUD - PRODUCTION"
echo "========================================="

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен!"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен!"
    exit 1
fi

echo ""
echo "✅ Docker установлен"
echo "✅ Docker Compose установлен"

# Создание необходимых директорий
echo ""
echo "📁 Создание необходимых директорий..."
mkdir -p logs uploads storage ssl frontend_build

# Проверка наличия frontend build
if [ ! -d "../mycloudfrontend/build" ]; then
    echo "⚠️  Frontend build не найден!"
    echo "📦 Попытка собрать фронтенд..."
    
    if [ -d "../mycloudfrontend" ]; then
        cd ../mycloudfrontend
        
        # Проверка npm
        if ! command -v npm &> /dev/null; then
            echo "❌ npm не установлен! Установите Node.js и npm"
            exit 1
        fi
        
        echo "📦 Установка зависимостей..."
        npm install
        
        echo "🔨 Сборка фронтенда..."
        npm run build
        
        cd ../MyCloudBackend
    else
        echo "❌ Папка mycloudfrontend не найдена!"
        exit 1
    fi
fi

# Копирование frontend build
echo ""
echo "📋 Копирование React build..."
rm -rf ./frontend_build
cp -r ../mycloudfrontend/build ./frontend_build
echo "✅ React build скопирован"

# Остановка старых контейнеров
echo ""
echo "⏹️  Остановка старых контейнеров..."
docker-compose down -v

# Очистка старых образов и кэша
echo ""
echo "🗑️  Очистка Docker системы..."
docker system prune -af --volumes

# Сборка образов без кэша
echo ""
echo "🔨 Сборка Docker образов (без кэша)..."
docker-compose build --no-cache

# Запуск контейнеров
echo ""
echo "▶️  Запуск контейнеров..."
docker-compose up -d

# Ожидание запуска сервисов
echo ""
echo "⏳ Ожидание запуска сервисов..."
sleep 20

# Проверка статуса контейнеров
echo ""
echo "📊 Статус контейнеров:"
docker-compose ps

# Проверка логов
echo ""
echo "📋 Последние 30 строк логов web:"
docker-compose logs --tail=30 web

echo ""
echo "📋 Последние 30 строк логов nginx:"
docker-compose logs --tail=30 nginx

# Создание суперпользователя (интерактивно)
echo ""
echo "👤 Создание суперпользователя (если нужно)..."
echo "Нажмите Ctrl+C для пропуска, если уже создан"
sleep 3
docker-compose exec web python manage.py createsuperuser || true

# Финальная проверка
echo ""
echo "========================================="
echo "✨ ДЕПЛОЙ ЗАВЕРШЕН!"
echo "========================================="
echo ""
echo "🌐 Сайт доступен по адресу:"
echo "   http://83.166.245.17"
echo ""
echo "🔐 Админ-панель:"
echo "   http://83.166.245.17/admin/"
echo ""
echo "📡 API:"
echo "   http://83.166.245.17/api/"
echo ""
echo "📋 Полезные команды:"
echo "   docker-compose logs -f         # Просмотр логов"
echo "   docker-compose ps              # Статус контейнеров"
echo "   docker-compose restart         # Перезапуск"
echo "   docker-compose down            # Остановка"
echo ""
