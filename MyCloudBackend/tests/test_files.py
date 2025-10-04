import pytest
from django.urls import reverse
from rest_framework import status
from storage.models import File

@pytest.mark.files
@pytest.mark.django_db
class TestFileList:
    def test_get_files_list(self, auth_client, file_obj):
        url = reverse('file-list')
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert len(response.data['files']) == 1

    def test_get_files_list_unauthorized(self, api_client):
        url = reverse('file-list')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.files
@pytest.mark.django_db
class TestFileUpload:
    def test_upload_file_success(self, auth_client, sample_file, temp_media_root):
        url = reverse('file-upload')
        data = {'file': sample_file, 'comment': 'Test upload'}
        response = auth_client.post(url, data, format='multipart')
        assert response.status_code == status.HTTP_201_CREATED
        assert File.objects.filter(original_name='test.txt').exists()

    def test_upload_without_file(self, auth_client):
        url = reverse('file-upload')
        response = auth_client.post(url, {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data.get('code') == 'MISSING_FILE'

    def test_upload_large_file(self, auth_client, temp_media_root):
        from django.core.files.uploadedfile import SimpleUploadedFile
        large_content = b'x' * (101 * 1024 * 1024)
        large_file = SimpleUploadedFile('large.txt', large_content)
        url = reverse('file-upload')
        response = auth_client.post(url, {'file': large_file}, format='multipart')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data.get('code') == 'FILE_TOO_LARGE'


@pytest.mark.files
@pytest.mark.django_db
class TestFileDownload:
    def test_download_file_success(self, auth_client, file_obj, temp_media_root):
        url = reverse('file-download', kwargs={'pk': file_obj.id})
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        # consume streaming_content to close file handle
        for _ in response.streaming_content:
            pass
        disp = response.get('Content-Disposition', '')
        assert f'filename="{file_obj.original_name}"' in disp

    def test_download_nonexistent_file(self, auth_client):
        url = reverse('file-download', kwargs={'pk': 999})
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    def test_download_other_user_file(self, api_client, file_obj):
        from django.contrib.auth import get_user_model
        from rest_framework_simplejwt.tokens import RefreshToken
        User = get_user_model()
        other = User.objects.create_user('other', 'o@o.com', 'Pass123!')
        token = RefreshToken.for_user(other)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')
        url = reverse('file-download', kwargs={'pk': file_obj.id})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.files
@pytest.mark.django_db
class TestFileDelete:
    def test_delete_file_success(self, auth_client, file_obj):
        url = reverse('file-delete', kwargs={'pk': file_obj.id})
        response = auth_client.delete(url)
        assert response.status_code == status.HTTP_200_OK
        assert not File.objects.filter(id=file_obj.id).exists()

    def test_delete_nonexistent_file(self, auth_client):
        url = reverse('file-delete', kwargs={'pk': 999})
        response = auth_client.delete(url)
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


@pytest.mark.files
@pytest.mark.django_db
class TestFileRename:
    def test_rename_file_success(self, auth_client, file_obj):
        url = reverse('file-rename', kwargs={'pk': file_obj.id})
        response = auth_client.patch(url, {'new_name': 'renamed.txt'})
        assert response.status_code == status.HTTP_200_OK
        file_obj.refresh_from_db()
        assert file_obj.original_name == 'renamed.txt'

    def test_rename_file_empty_name(self, auth_client, file_obj):
        url = reverse('file-rename', kwargs={'pk': file_obj.id})
        response = auth_client.patch(url, {'new_name': ''})
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.files
@pytest.mark.django_db
class TestFileComment:
    def test_update_comment_success(self, auth_client, file_obj):
        url = reverse('file-comment', kwargs={'pk': file_obj.id})
        response = auth_client.patch(url, {'comment': 'New comment'})
        assert response.status_code == status.HTTP_200_OK
        file_obj.refresh_from_db()
        assert file_obj.comment == 'New comment'

    def test_update_comment_too_long(self, auth_client, file_obj):
        url = reverse('file-comment', kwargs={'pk': file_obj.id})
        response = auth_client.patch(url, {'comment': 'x' * 501})
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.files
@pytest.mark.django_db
class TestPublicDownload:
    def test_public_download_success(self, api_client, file_obj, temp_media_root):
        url = reverse('file-public-download', kwargs={'public_link': file_obj.public_link})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        # consume streaming_content to close file handle
        for _ in response.streaming_content:
            pass

    def test_public_download_invalid_link(self, api_client):
        url = reverse('file-public-download', kwargs={'public_link': 'invalid'})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND
