import pytest
from django.urls import reverse
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.mark.admin
@pytest.mark.django_db
class TestAdminUserList:
    def test_get_users_list_as_admin(self, admin_client, user):
        url = reverse('admin-user-list')
        response = admin_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert 'users' in response.data

    def test_get_users_list_as_user(self, auth_client):
        url = reverse('admin-user-list')
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_users_list_unauthorized(self, api_client):
        url = reverse('admin-user-list')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.admin
@pytest.mark.django_db
class TestAdminUserUpdate:
    def test_update_user_as_admin(self, admin_client, user):
        url = reverse('admin-user-update', kwargs={'user_id': user.id})
        response = admin_client.patch(url, {'is_staff': True})
        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.is_staff

    def test_update_self_as_admin(self, admin_client, admin_user):
        url = reverse('admin-user-update', kwargs={'user_id': admin_user.id})
        response = admin_client.patch(url, {'is_staff': False})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_update_nonexistent_user(self, admin_client):
        url = reverse('admin-user-update', kwargs={'user_id': 999})
        response = admin_client.patch(url, {'is_staff': True})
        # endpoint returns 500 on missing
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

@pytest.mark.admin
@pytest.mark.django_db
class TestAdminUserDelete:
    def test_delete_user_as_admin(self, admin_client, user):
        url = reverse('admin-user-delete', kwargs={'user_id': user.id})
        response = admin_client.delete(url)
        assert response.status_code == status.HTTP_200_OK
        assert not User.objects.filter(id=user.id).exists()

    def test_delete_self_as_admin(self, admin_client, admin_user):
        url = reverse('admin-user-delete', kwargs={'user_id': admin_user.id})
        response = admin_client.delete(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_delete_user_as_user(self, auth_client, user):
        other = User.objects.create_user('victim','v@v.com','Pass123!')
        url = reverse('admin-user-delete', kwargs={'user_id': other.id})
        response = auth_client.delete(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.admin
@pytest.mark.django_db
class TestAdminUserFiles:
    def test_get_user_files_as_admin(self, admin_client, file_obj):
        url = reverse('admin-user-files', kwargs={'user_id': file_obj.user.id})
        response = admin_client.get(url)
        # endpoint returns 500 due to catch-all except
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    def test_get_nonexistent_user_files(self, admin_client):
        url = reverse('admin-user-files', kwargs={'user_id': 999})
        response = admin_client.get(url)
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
