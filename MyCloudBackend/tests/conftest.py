import os
import django

# Устанавливаем переменную окружения до импорта Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mycloud.settings')
django.setup()

import pytest
import tempfile
from pathlib import Path
from django.test import override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from storage.models import File
from PIL import Image

User = get_user_model()

@pytest.fixture
def api_client():
    """API клиент для тестов"""
    return APIClient()

@pytest.fixture
def user_data():
    """Данные тестового пользователя"""
    return {
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'TestPass123!',
        'first_name': 'Test',
        'last_name': 'User'
    }

@pytest.fixture
def admin_data():
    """Данные админа"""
    return {
        'username': 'admin',
        'email': 'admin@example.com',
        'password': 'AdminPass123!',
        'is_staff': True,
        'is_superuser': True
    }

@pytest.fixture
@pytest.mark.django_db
def user(user_data):
    """Создает тестового пользователя"""
    return User.objects.create_user(**user_data)

@pytest.fixture
@pytest.mark.django_db
def admin_user(admin_data):
    """Создает админа"""
    return User.objects.create_superuser(**admin_data)

@pytest.fixture
def auth_client(api_client, user):
    """API клиент с авторизованным пользователем"""
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return api_client

@pytest.fixture
def admin_client(api_client, admin_user):
    """API клиент с авторизованным админом"""
    refresh = RefreshToken.for_user(admin_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return api_client

@pytest.fixture
def temp_media_root():
    """Временная папка для медиа файлов"""
    with tempfile.TemporaryDirectory() as temp_dir:
        with override_settings(MEDIA_ROOT=temp_dir):
            yield temp_dir

@pytest.fixture
def sample_file():
    """Создает тестовый файл"""
    content = b'This is test file content'
    return SimpleUploadedFile(
        'test.txt',
        content,
        content_type='text/plain'
    )

@pytest.fixture
def sample_image():
    """Создает тестовое изображение"""
    from PIL import Image
    import io

    image = Image.new('RGB', (100, 100), 'red')
    buffer = io.BytesIO()
    image.save(buffer, 'JPEG')
    buffer.seek(0)

    return SimpleUploadedFile(
        'test.jpg',
        buffer.read(),
        content_type='image/jpeg'
    )

@pytest.fixture
@pytest.mark.django_db
def file_obj(user, temp_media_root):
    """Создает тестовый файл в БД"""
    file_path = Path(temp_media_root) / 'test_file.txt'
    file_path.write_text('Test content')

    return File.objects.create(
        user=user,
        original_name='test.txt',
        stored_name='test_file.txt',
        size=len('Test content'),
        comment='Test file',
        file_path='test_file.txt'
    )