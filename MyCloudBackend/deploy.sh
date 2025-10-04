#!/bin/bash
echo "🚀 ДЕПЛОЙ MYCLOUD"

if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен!"
    exit 1
fi

mkdir -p logs ssl

if [ -d "../mycloudfrontend/build" ]; then
    cp -r ../mycloudfrontend/build ./frontend_build
    echo "✅ React build скопирован"
fi

docker-compose build
docker-compose up -d

sleep 15
docker-compose exec web python manage.py migrate
docker-compose exec web python manage.py createsuperuser --noinput --username admin --email admin@mycloud.com || true

echo "✅ ДЕПЛОЙ ЗАВЕРШЕН!"
echo "🌐 Сайт: http://83.166.245.17"
