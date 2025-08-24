# MyCloud Project (Монорепозиторий)

Репозиторий содержит два проекта для дипломного задания:  
- Backend — Django REST API для облачного хранилища  
- Frontend — React приложение для взаимодействия с хранилищем  

---

## Структура

diplom/
│
├── MyCloudBackend/ # Django backend
│ ├── mycloud/
│ ├── storage/
│ ├── manage.py
│ ├── requirements.txt
│ ├── README.md # README для backend
│ └── ...
│
├── mycloudfrontend/ # React frontend
│ ├── public/
│ ├── src/
│ ├── package.json
│ ├── README.md # README для frontend
│ └── ...
│
└── README.md # (этот файл — общий README для всего репозитория)


---

## Как запустить

### Backend

1. Перейти в папку backend:

cd MyCloudBackend


2. Создать и активировать виртуальное окружение

3. Установить зависимости:

pip install -r requirements.txt


4. Выполнить миграции и запустить сервер:

python manage.py migrate
python manage.py runserver


### Frontend

1. Перейти в папку frontend:

cd mycloudfrontend



2. Установить зависимости и запустить:

npm install
npm start



---

## Важные ссылки

- [README backend](MyCloudBackend/README.md)  
- [README frontend](mycloudfrontend/README.md)  

---

## Контакты

evgenia.sadovnikova@mail.ru
