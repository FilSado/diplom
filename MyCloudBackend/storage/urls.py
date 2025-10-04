from django.urls import path, include, re_path
from django.http import HttpResponse, JsonResponse
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static
from .views import (
    # Auth views
    CustomTokenObtainPairView,
    CookieTokenRefreshView,
    RegisterView,
    LogoutView,
    current_user_view,
    CurrentUserView,  # ДОБАВЛЕН
    health_check,
    
    # File views
    FileListView,
    FileUploadView,
    FileDeleteView,
    RenameFileView,
    UpdateFileCommentView,
    DownloadFileView,
    PublicDownloadView,
    CopyLinkView,
    
    # Admin views
    AdminUserListView,
    AdminUserUpdateView,
    AdminUserDeleteView,
    AdminUserFilesView,
)


def api_home(request):
    """API главная страница с документацией"""
    api_info = {
        "name": "MyCloud API",
        "version": "1.0.0",
        "description": "Cloud storage service API",
        "documentation": {
            "swagger": "/api/docs/",
            "redoc": "/api/redoc/"
        },
        "endpoints": {
            "authentication": {
                "login": "/api/auth/login/",
                "register": "/api/auth/register/", 
                "logout": "/api/auth/logout/",
                "refresh": "/api/auth/token/refresh/",
                "current_user": "/api/auth/user/me/"
            },
            "files": {
                "list": "/api/files/",
                "upload": "/api/files/upload/",
                "download": "/api/files/{id}/download/",
                "delete": "/api/files/{id}/",
                "rename": "/api/files/{id}/rename/",
                "comment": "/api/files/{id}/comment/",
                "copy_link": "/api/files/{id}/copy-link/",
                "public_download": "/api/files/download/public/{public_link}/"
            },
            "admin": {
                "users": "/api/admin/users/",
                "user_detail": "/api/admin/users/{id}/",
                "user_files": "/api/admin/users/{id}/files/",
                "delete_user": "/api/admin/users/{id}/delete/"
            }
        },
        "status": "operational",
        "contact": {
            "support": "support@mycloud.com",
            "docs": "https://docs.mycloud.com"
        }
    }
    
    if request.accepts('application/json'):
        return JsonResponse(api_info)
    
    # HTML ответ для браузера
    html_content = f"""
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MyCloud API</title>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; background: #f5f5f5; }}
            .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
            h1 {{ color: #1890ff; text-align: center; margin-bottom: 30px; }}
            h2 {{ color: #333; border-bottom: 2px solid #1890ff; padding-bottom: 10px; }}
            .endpoint {{ background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #1890ff; }}
            .method {{ font-weight: bold; color: #28a745; }}
            a {{ color: #1890ff; text-decoration: none; }}
            a:hover {{ text-decoration: underline; }}
            .status {{ background: #d4edda; color: #155724; padding: 10px; border-radius: 5px; text-align: center; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 MyCloud API v1.0.0</h1>
            <div class="status">✅ API работает нормально</div>
            
            <h2>🔐 Аутентификация</h2>
            <div class="endpoint">
                <span class="method">POST</span> <a href="/api/auth/login/">/api/auth/login/</a> - Вход в систему
            </div>
            <div class="endpoint">
                <span class="method">POST</span> <a href="/api/auth/register/">/api/auth/register/</a> - Регистрация
            </div>
            <div class="endpoint">
                <span class="method">GET</span> <a href="/api/auth/user/me/">/api/auth/user/me/</a> - Текущий пользователь
            </div>
            <div class="endpoint">
                <span class="method">POST</span> <a href="/api/auth/logout/">/api/auth/logout/</a> - Выход
            </div>
            
            <h2>📁 Управление файлами</h2>
            <div class="endpoint">
                <span class="method">GET</span> <a href="/api/files/">/api/files/</a> - Список файлов
            </div>
            <div class="endpoint">
                <span class="method">POST</span> /api/files/upload/ - Загрузка файла
            </div>
            <div class="endpoint">
                <span class="method">GET</span> /api/files/{{id}}/download/ - Скачивание файла
            </div>
            <div class="endpoint">
                <span class="method">DELETE</span> /api/files/{{id}}/ - Удаление файла
            </div>
            
            <h2>👥 Администрирование</h2>
            <div class="endpoint">
                <span class="method">GET</span> <a href="/api/admin/users/">/api/admin/users/</a> - Список пользователей
            </div>
            
            <h2>🔧 Утилиты</h2>
            <div class="endpoint">
                <span class="method">GET</span> <a href="/api/health/">/api/health/</a> - Проверка здоровья API
            </div>
            
            <h2>📚 Документация</h2>
            <p><a href="/api/docs/">📖 Swagger UI документация</a></p>
            <p><a href="/api/redoc/">📋 ReDoc документация</a></p>
            
            <hr style="margin: 30px 0;">
            <p style="text-align: center; color: #666;">
                <strong>MyCloud API</strong> | 
                <a href="mailto:support@mycloud.com">Поддержка</a> | 
                <a href="https://docs.mycloud.com">Документация</a>
            </p>
        </div>
    </body>
    </html>
    """
    return HttpResponse(html_content)


def api_version(request):
    """Информация о версии API"""
    return JsonResponse({
        "version": "1.0.0",
        "release_date": "2025-09-12",
        "supported_versions": ["v1"],
        "deprecated_versions": [],
        "changelog": "/api/changelog/",
        "status": "stable"
    })


urlpatterns = [
    path('', api_home, name='api_home'),
    path('version/', api_version, name='api_version'),
    path('health/', health_check, name='health_check'),

    path('auth/', include([
        path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
        path('token/refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
        path('register/', RegisterView.as_view(), name='register'),
        path('logout/', LogoutView.as_view(), name='logout'),
        path('user/me/', CurrentUserView.as_view(), name='current_user'),  # ИСПРАВЛЕНО
    ])),

    path('files/', include([
        path('', FileListView.as_view(), name='file-list'),
        path('upload/', FileUploadView.as_view(), name='file-upload'),
        path('<int:pk>/', FileDeleteView.as_view(), name='file-delete'),
        path('<int:pk>/rename/', RenameFileView.as_view(), name='file-rename'),
        path('<int:pk>/comment/', UpdateFileCommentView.as_view(), name='file-comment'),
        path('<int:pk>/download/', DownloadFileView.as_view(), name='file-download'),
        path('<int:pk>/copy-link/', CopyLinkView.as_view(), name='file-copy-link'),
        path('download/public/<str:public_link>/', PublicDownloadView.as_view(), name='file-public-download'),
    ])),

    path('admin/', include([
        path('users/', AdminUserListView.as_view(), name='admin-user-list'),
        path('users/<int:user_id>/', AdminUserUpdateView.as_view(), name='admin-user-update'),
        path('users/<int:user_id>/delete/', AdminUserDeleteView.as_view(), name='admin-user-delete'),
        path('users/<int:user_id>/files/', AdminUserFilesView.as_view(), name='admin-user-files'),
    ])),
]

# Раздача статики React
urlpatterns += static(
    '/', document_root=settings.BASE_DIR / 'frontend_build'
)

# Статические и медиа-файлы Django
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# SPA fallback (только для не-API и не-статических путей)
urlpatterns += [
    re_path(
        r'^(?!api/|static/|media/|favicon\.ico|manifest\.json).*$',
        TemplateView.as_view(template_name='index.html'),
        name='spa-fallback'
    ),
]
