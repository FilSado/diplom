import pytest
from django.urls import reverse
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.mark.auth
@pytest.mark.django_db
class TestRegistration:
    def test_register_success(self, api_client):
        """Успешная регистрация пользователя"""
        url = reverse('register')
        data = {
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'NewPass123!',
            'password_confirm': 'NewPass123!',
            'first_name': 'New',
            'last_name': 'User'
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert 'tokens' in response.data
        assert User.objects.filter(username='newuser').exists()

    def test_register_password_mismatch(self, api_client):
        """Регистрация с несовпадающими паролями"""
        url = reverse('register')
        data = {
            'username': 'newuser',
            'email': 'new@example.com', 
            'password': 'NewPass123!',
            'password_confirm': 'DifferentPass123!'
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'password_confirm' in response.data

    def test_register_weak_password(self, api_client):
        """Регистрация со слабым паролем"""
        url = reverse('register')
        data = {
            'username': 'newuser',
            'email': 'new@example.com',
            'password': '123',
            'password_confirm': '123'
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_duplicate_username(self, api_client, user):
        """Регистрация с существующим логином"""
        url = reverse('register')
        data = {
            'username': user.username,
            'email': 'different@example.com',
            'password': 'NewPass123!',
            'password_confirm': 'NewPass123!'
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

@pytest.mark.auth
@pytest.mark.django_db  
class TestLogin:
    def test_login_success(self, api_client, user, user_data):
        """Успешный вход в систему"""
        url = reverse('token_obtain_pair')
        data = {
            'username': user_data['username'],
            'password': user_data['password']
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert 'user' in response.data

    def test_login_invalid_credentials(self, api_client):
        """Вход с неверными данными"""
        url = reverse('token_obtain_pair')
        data = {
            'username': 'nonexistent',
            'password': 'wrongpass'
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_token_refresh(self, api_client, user):
        """Обновление токена"""
        from rest_framework_simplejwt.tokens import RefreshToken
        
        refresh = RefreshToken.for_user(user)
        url = reverse('token_refresh')
        data = {'refresh': str(refresh)}
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data

@pytest.mark.auth
@pytest.mark.django_db
class TestLogout:
    def test_logout_success(self, auth_client, user):
        """Успешный выход из системы"""
        url = reverse('logout')
        response = auth_client.post(url)
        assert response.status_code == status.HTTP_200_OK

@pytest.mark.auth
@pytest.mark.django_db
class TestCurrentUser:
    def test_get_current_user(self, auth_client, user):
        """Получение данных текущего пользователя"""
        url = reverse('current_user')
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == user.id
        assert response.data['username'] == user.username

    def test_get_current_user_unauthorized(self, api_client):
        """Получение данных без авторизации"""
        url = reverse('current_user')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
