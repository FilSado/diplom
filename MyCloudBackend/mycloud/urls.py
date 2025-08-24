from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from storage.views import RegisterView, LogoutView

urlpatterns = [
    path('admin/', admin.site.urls),

    # JWT авторизация
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Регистрация пользователя
    path('api/register/', RegisterView.as_view(), name='register'),

    # Logout
    path('api/logout/', LogoutView.as_view(), name='auth_logout'),

    # Остальные роуты из приложения storage (файлы/пользователи/админ‑функции)
    path('api/', include('storage.urls')),
]

# Отдача загруженных файлов в режиме разработки
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
