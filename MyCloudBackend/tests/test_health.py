import pytest
from django.urls import reverse
from rest_framework import status

@pytest.mark.django_db
class TestHealthCheck:
    def test_health_check_endpoint(self, api_client):
        """Проверка эндпоинта здоровья API"""
        url = reverse('health_check')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'ok'
        assert 'database' in response.data
        assert 'storage' in response.data
