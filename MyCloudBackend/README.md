# MyCloudBackend

## Описание

Облачное хранилище с регистрацией пользователей, загрузкой и управлением файлами через REST API.

## Структура проекта

- `mycloud/` — основной модуль Django с настройками и URL-ами
- `storage/` — приложение для работы с файловым хранилищем и пользователями:
  - `models.py` — модели данных (User, File)
  - `views.py` — API views для регистрации, авторизации, работы с файлами и админкой
  - `serializers.py` — сериализаторы для работы с JSON
  - `urls.py` — маршруты API
- `media/` — директория для сохранения загруженных файлов
- `requirements.txt` — зависимости проекта

## Требования

- Python >= 3.10
- Django >= 3.2
- djangorestframework
- djangorestframework-simplejwt
- PostgreSQL

## Установка и запуск

1. Клонировать репозиторий:

git clone <ссылка-на-репозиторий>
cd mycloudbackend


2. Создать и активировать виртуальное окружение:

python -m venv venv
source venv/bin/activate # Linux/Mac
venv\Scripts\activate # Windows


3. Установить зависимости:

pip install -r requirements.txt



4. Настроить базу данных в `settings.py`:

DATABASES = {
'default': {
'ENGINE': 'django.db.backends.postgresql',
'NAME': 'myclouddb',
'USER': 'myuser',
'PASSWORD': 'mypassword',
'HOST': 'localhost',
'PORT': '5432',
}
}



5. Выполнить миграции и создать суперпользователя:


python manage.py migrate
python manage.py createsuperuser



6. Запустить сервер:


python manage.py runserver



## API

- Регистрация: `POST /api/register/`  
- Авторизация: `POST /api/token/`, `POST /api/token/refresh/` (JWT)  
- Логаут: `POST /api/logout/`

### Работа с файлами (требуется авторизация):

- `GET /api/files/` — список файлов пользователя  
- `POST /api/files/upload/` — загрузка файла  
- `PATCH /api/files/<id>/comment/` — редактирование комментария  
- `PATCH /api/files/<id>/rename/` — переименование файла  
- `DELETE /api/files/<id>/` — удаление файла  
- `GET /api/files/<id>/download/` — скачивание файла  
- `GET /api/files/download/public/<public_link>/` — скачивание по публичной ссылке

### Администрирование (только для админов):

- `GET /api/users/` — список пользователей  
- `PATCH /api/users/<id>/` — редактирование пользователя  
- `DELETE /api/users/<id>/delete/` — удаление пользователя

## Логирование

Все действия логируются в консоль с указанием времени и пользователя.

## Тестирование

Запуск тестов:

python manage.py test



## Развёртывание

Инструкции по развёртыванию на reg.ru или VPS требует настройки Nginx, Gunicorn и базы данных.

---

# Контакты

evgenia.sadovnikova@mail.ru



