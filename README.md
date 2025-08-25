# MyCloud Project (Монорепозиторий)

Репозиторий содержит два проекта для дипломного задания:  
- Backend — Django REST API для облачного хранилища  
- Frontend — React приложение для взаимодействия с хранилищем  

---

## Структура проекта

diplom/  
│  
├── MyCloudBackend/  # Django backend  
│   ├── mycloud/  
│   ├── storage/  
│   ├── manage.py  
│   ├── requirements.txt  
│   ├── README.md # README для backend  
│   └── ...  
│  
├── mycloudfrontend/  # React frontend  
│   ├── public/  
│   ├── src/  
│   ├── package.json  
│   ├── README.md # README для frontend  
│   └── ...  
│  
└── README.md  # (этот файл — общий README для всего репозитория)  

---

## Как запустить проект

### Backend

1. Клонируйте репозиторий и перейдите в папку backend:

cd MyCloudBackend


2. Создайте и активируйте виртуальное окружение:

python3 -m venv venv
source venv/bin/activate


3. Установите зависимости:

pip install -r requirements.txt


4. Выполните миграции базы данных:

python manage.py migrate


5. Запустите backend на Gunicorn:

gunicorn mycloud.wsgi:application --bind 0.0.0.0:8000


Или настройте и запустите службу systemd (рекомендуется):

sudo systemctl daemon-reload
sudo systemctl start gunicorn
sudo systemctl enable gunicorn


---

### Frontend

1. Перейдите в папку frontend:

cd mycloudfrontend


2. Установите npm-зависимости:


2. Установите npm-зависимости:


3. Соберите проект:

npm run build


4. Копируйте содержимое папки `build` в директорию для отдачи Nginx, например `/var/www/html`:

cp -r build/* /var/www/html/


---

### Настройка Nginx

1. Создайте или отредактируйте конфигурационный файл `/etc/nginx/sites-available/mycloud`:

server {
listen 80;
server_name <ваш_домен_или_IP>;

root /var/www/html;
index index.html;

# Отдача React фронтенда
location / {
    try_files $uri $uri/ /index.html;
}

# Проксирование API на backend Django
location /api/ {
    proxy_pass http://127.0.0.1:8000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
}


2. Включите сайт и перезапустите nginx:

sudo ln -s /etc/nginx/sites-available/mycloud /etc/nginx/sites-enabled/
sudo systemctl restart nginx


---

## Тестирование проекта

1. Откройте в браузере:

- `http://<IP_сервера>/` — должна открываться React-страница с интерфейсом облачного хранилища.
- `http://<IP_сервера>/api/` — должен возвращаться ответ backend (например, "API root works").

2. Проверьте основные функции:

- Регистрация и аутентификация.
- Загрузка, просмотр, переименование и скачивание файлов.
- Управление пользователями (если есть административный функционал).

3. Для автоматического тестирования используйте Django тесты (если реализованы) или инструменты типа Postman.

---

## Автозапуск backend (Gunicorn) через systemd

Backend настроен для автоматического запуска службой systemd (gunicorn.service). При перезагрузке сервера Gunicorn запускается автоматически.

Для проверки статуса используйте:

sudo systemctl status gunicorn


Для просмотра логов:

sudo journalctl -u gunicorn -f


---

## Контакты

Если возникнут вопросы, пишите на:

evgenia.sadovnikova@mail.ru

---
