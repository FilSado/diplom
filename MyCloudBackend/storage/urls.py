from django.urls import path
from django.http import HttpResponse
from .views import (
    FileListView,
    FileUploadView,
    FileDeleteView,
    RenameFileView,
    UpdateFileCommentView,
    DownloadFileView,
    PublicDownloadView,
    AdminUserListView,
    AdminUserUpdateView,
    AdminUserDeleteView,
    AdminUserFilesView,
)

def api_home(request):
    return HttpResponse("API root works")


urlpatterns = [
    path('', api_home, name='api_home'),
    # ==== Файлы пользователя ====
    path('files/', FileListView.as_view(), name='file-list'),
    path('files/upload/', FileUploadView.as_view(), name='file-upload'),
    path('files/<int:pk>/', FileDeleteView.as_view(), name='file-delete'),
    path('files/<int:pk>/rename/', RenameFileView.as_view(), name='file-rename'),
    path('files/<int:pk>/comment/', UpdateFileCommentView.as_view(), name='file-comment'),
    path('files/<int:pk>/download/', DownloadFileView.as_view(), name='file-download'),
    path('files/download/public/<str:public_link>/', PublicDownloadView.as_view(), name='file-public-download'),

    # ==== Админские методы ====
    path('users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('users/<int:user_id>/', AdminUserUpdateView.as_view(), name='admin-user-update'),
    path('users/<int:user_id>/delete/', AdminUserDeleteView.as_view(), name='admin-user-delete'),
    path('users/<int:user_id>/files/', AdminUserFilesView.as_view(), name='admin-user-files'),
]
