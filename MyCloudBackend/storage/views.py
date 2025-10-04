import os
import uuid
import logging
import mimetypes
from pathlib import Path
from django.conf import settings
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.http import FileResponse, JsonResponse, Http404
from django.contrib.auth import get_user_model, authenticate
from django.db.models import Count, Sum
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.core.cache import cache
from django.db import transaction

from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle

from .models import File
from .serializers import (
    FileSerializer,
    RegisterSerializer,
    CustomTokenObtainPairSerializer,
    AdminUserSerializer,
    UserProfileSerializer
)

logger = logging.getLogger(__name__)
User = get_user_model()

# ==== Настройки безопасности ====
ALLOWED_FILE_TYPES = {
    # Изображения
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    # Документы
    'application/pdf', 'text/plain', 'text/markdown',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    # Таблицы
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    # Презентации
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    # Архивы
    'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
    # Аудио/Видео
    'video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo',
    'audio/mpeg', 'audio/wav', 'audio/ogg',
    # Код
    'application/json', 'application/xml', 'text/html', 'text/css', 'application/javascript'
}

MAX_FILE_SIZE = getattr(settings, 'MAX_FILE_SIZE', 100 * 1024 * 1024)  # 100MB
MAX_FILES_PER_USER = getattr(settings, 'MAX_FILES_PER_USER', 1000)

# ==== Throttling классы ====
class UploadRateThrottle(UserRateThrottle):
    scope = 'upload'

class AdminActionThrottle(UserRateThrottle):
    scope = 'admin'

# ==== JWT Аутентификация ====
class CustomTokenObtainPairView(TokenObtainPairView):
    """Кастомный view для получения токенов с данными пользователя"""
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = (AllowAny,)
    throttle_classes = [AnonRateThrottle]
    
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            access = response.data.get("access")
            refresh = response.data.get("refresh")
            
            # Устанавливаем secure cookies в production
            is_secure = not settings.DEBUG
            response.set_cookie(
                "access_token",
                access,
                httponly=True,
                secure=is_secure,
                samesite="Lax" if not is_secure else "Strict",
                max_age=15*60
            )
            response.set_cookie(
                "refresh_token",
                refresh,
                httponly=True,
                secure=is_secure,
                samesite="Lax" if not is_secure else "Strict",
                max_age=7*24*60*60
            )
            
            # Логируем успешный вход
            if 'user' in response.data:
                username = response.data['user'].get('username', 'unknown')
                logger.info(f"Успешный вход пользователя: {username}")
            
        return response

class CookieTokenRefreshView(TokenRefreshView):
    permission_classes = (AllowAny,)
    throttle_classes = [AnonRateThrottle]
    
    def post(self, request, *args, **kwargs):
        # Создаем мутабельную копию данных запроса
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        
        # Получаем refresh token из cookies если нет в body
        if not data.get('refresh'):
            refresh_token = request.COOKIES.get('refresh_token')
            if refresh_token:
                data['refresh'] = refresh_token
                request._full_data = data
                
        response = super().post(request, *args, **kwargs)
        
        if response.status_code == 200:
            access = response.data.get("access")
            is_secure = not settings.DEBUG
            response.set_cookie(
                "access_token",
                access,
                httponly=True,
                secure=is_secure,
                samesite="Lax" if not is_secure else "Strict",
                max_age=15*60
            )
        return response

# ==== Получение данных текущего пользователя ====
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    """Получение данных текущего аутентифицированного пользователя"""
    user = request.user
    
    # Кэшируем статистику пользователя на 5 минут
    cache_key = f"user_stats_{user.id}"
    user_stats = cache.get(cache_key)
    
    if user_stats is None:
        user_files = File.objects.filter(user=user)
        user_stats = {
            'file_count': user_files.count(),
            'total_size': user_files.aggregate(Sum('size'))['size__sum'] or 0
        }
        cache.set(cache_key, user_stats, 300)  # 5 минут
    
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name or '',
        'last_name': user.last_name or '',
        'full_name': user.get_full_name() or user.username,
        'role': 'admin' if (user.is_staff or user.is_superuser) else 'user',
        'avatar': getattr(user, 'avatar', None),
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'is_active': user.is_active,
        'file_count': user_stats['file_count'],
        'total_size': user_stats['total_size'],
        'date_joined': user.date_joined.isoformat() if hasattr(user, 'date_joined') else None,
        'last_login': user.last_login.isoformat() if user.last_login else None
    })

# ==== Регистрация ====
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer
    throttle_classes = [AnonRateThrottle]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        
        if response.status_code == status.HTTP_201_CREATED:
            # Безопасная автоматическая авторизация
            username = request.data.get('username')
            password = request.data.get('password')
            
            if username and password:
                user = authenticate(request, username=username, password=password)
                if user and user.is_active:
                    refresh = RefreshToken.for_user(user)
                    response.data['tokens'] = {
                        'refresh': str(refresh),
                        'access': str(refresh.access_token),
                    }
                    response.data['user'] = {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'full_name': user.get_full_name() or user.username,
                        'role': 'admin' if user.is_staff else 'user',
                        'is_staff': user.is_staff,
                        'is_superuser': user.is_superuser
                    }
                    
                    logger.info(f"Новый пользователь зарегистрирован и авторизован: {username}")
                    
        return response

# ==== Logout ====
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.COOKIES.get("refresh_token") or request.data.get("refresh")
            
            # Добавляем токен в blacklist если он есть
            if refresh_token:
                try:
                    token = RefreshToken(refresh_token)
                    token.blacklist()
                except Exception as e:
                    logger.warning(f"Ошибка при добавлении токена в blacklist: {str(e)}")
            
            response = Response({
                "detail": "Logged out successfully.",
                "message": "Вы успешно вышли из системы"
            }, status=status.HTTP_200_OK)
            
            # Очищаем cookies
            response.delete_cookie("access_token", samesite="Lax")
            response.delete_cookie("refresh_token", samesite="Lax")
            
            # Очищаем кэш пользователя
            cache.delete(f"user_stats_{request.user.id}")
            
            logger.info(f"Пользователь {request.user.username} вышел из системы")
            return response
            
        except Exception as e:
            logger.error(f"Ошибка при logout: {str(e)}")
            response = Response({"detail": "Logged out"}, status=status.HTTP_200_OK)
            response.delete_cookie("access_token", samesite="Lax") 
            response.delete_cookie("refresh_token", samesite="Lax")
            return response

# ==== Список файлов пользователя ====
class FileListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Админы могут видеть файлы конкретного пользователя
            user_id = request.GET.get('user_id')
            if user_id and request.user.is_staff:
                try:
                    user = User.objects.get(pk=user_id)
                    files = File.objects.filter(user=user)
                except User.DoesNotExist:
                    return Response({"error": "Пользователь не найден"}, status=status.HTTP_404_NOT_FOUND)
            else:
                files = File.objects.filter(user=request.user)
            
            # Пагинация и сортировка
            ordering = request.GET.get('ordering', '-uploaded_at')
            files = files.order_by(ordering)
            
            serializer = FileSerializer(files, many=True, context={'request': request})
            return Response({
                'count': files.count(),
                'files': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Ошибка при получении списка файлов: {str(e)}")
            return Response({"error": "Ошибка сервера"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ==== Загрузка файла ====
class FileUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]
    throttle_classes = [UploadRateThrottle]

    @transaction.atomic
    def post(self, request):
        uploaded = request.FILES.get('file')
        if not uploaded:
            return Response({
                "error": "Файл не прикреплён",
                "code": "MISSING_FILE"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Проверка лимита файлов пользователя
        user_file_count = File.objects.filter(user=request.user).count()
        if user_file_count >= MAX_FILES_PER_USER:
            return Response({
                "error": f"Превышен лимит файлов ({MAX_FILES_PER_USER})",
                "code": "FILE_LIMIT_EXCEEDED"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Проверка размера файла
        if uploaded.size > MAX_FILE_SIZE:
            return Response({
                "error": f"Файл слишком большой (максимум {MAX_FILE_SIZE // (1024*1024)}MB)",
                "code": "FILE_TOO_LARGE"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Проверка типа файла
        content_type = uploaded.content_type
        if content_type not in ALLOWED_FILE_TYPES:
            # Дополнительная проверка по расширению
            mime_type, _ = mimetypes.guess_type(uploaded.name)
            if mime_type not in ALLOWED_FILE_TYPES:
                return Response({
                    "error": f"Тип файла не поддерживается: {content_type}",
                    "code": "UNSUPPORTED_FILE_TYPE"
                }, status=status.HTTP_400_BAD_REQUEST)

        # Проверка имени файла
        if not uploaded.name or len(uploaded.name) > 255:
            return Response({
                "error": "Некорректное имя файла",
                "code": "INVALID_FILENAME"
            }, status=status.HTTP_400_BAD_REQUEST)

        comment = request.data.get('comment', '')[:500]  # Ограничиваем длину комментария

        # Создаем папку для файлов если её нет
        media_root = Path(settings.MEDIA_ROOT)
        media_root.mkdir(parents=True, exist_ok=True)

        # Генерируем уникальное имя файла
        _, ext = os.path.splitext(uploaded.name)
        stored_name = f"{request.user.id}_{uuid.uuid4().hex}{ext}"
        file_path = media_root / stored_name

        # Создаем запись в БД
        file_obj = File.objects.create(
            user=request.user,
            original_name=uploaded.name,
            stored_name=stored_name,
            size=uploaded.size,
            comment=comment,
            public_link=uuid.uuid4().hex,
            file_path=str(Path('uploads') / stored_name)
        )

        try:
            # Сохраняем файл
            with open(file_path, 'wb') as destination:
                for chunk in uploaded.chunks():
                    destination.write(chunk)
            
            # Очищаем кэш статистики пользователя
            cache.delete(f"user_stats_{request.user.id}")
            
            logger.info(f"Пользователь {request.user.username} загрузил файл {uploaded.name} ({uploaded.size} bytes)")
            return Response(
                FileSerializer(file_obj, context={'request': request}).data, 
                status=status.HTTP_201_CREATED
            )
        
        except Exception as e:
            # Откатываем изменения в БД
            file_obj.delete()
            # Удаляем файл если он успел создаться
            if file_path.exists():
                try:
                    file_path.unlink()
                except OSError:
                    pass
                    
            logger.error(f"Ошибка при сохранении файла: {str(e)}")
            return Response({
                "error": "Ошибка при сохранении файла",
                "code": "SAVE_ERROR"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ==== Копирование публичной ссылки ====
class CopyLinkView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            file_obj = get_object_or_404(File, pk=pk)
            
            if file_obj.user != request.user and not request.user.is_staff:
                return Response({
                    "detail": "Доступ запрещён",
                    "code": "ACCESS_DENIED"
                }, status=status.HTTP_403_FORBIDDEN)

            public_url = request.build_absolute_uri(
                f'/api/files/download/public/{file_obj.public_link}/'
            )
            
            return Response({
                "public_link": public_url,
                "short_link": file_obj.public_link,
                "expires": None  # Можно добавить срок истечения
            })
            
        except Exception as e:
            logger.error(f"Ошибка при создании публичной ссылки: {str(e)}")
            return Response({
                "error": "Ошибка сервера",
                "code": "SERVER_ERROR"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ==== Удаление файла ====
class FileDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def delete(self, request, pk):
        try:
            file_obj = get_object_or_404(File, pk=pk)
            
            if file_obj.user != request.user and not request.user.is_staff:
                return Response({
                    "detail": "Доступ запрещён",
                    "code": "ACCESS_DENIED"
                }, status=status.HTTP_403_FORBIDDEN)

            # Удаляем физический файл
            file_path = Path(settings.MEDIA_ROOT) / file_obj.stored_name
            if file_path.exists():
                try:
                    file_path.unlink()
                except OSError as e:
                    logger.error(f"Не удалось удалить файл {file_path}: {str(e)}")

            # Сохраняем информацию для логирования
            original_name = file_obj.original_name
            
            # Удаляем запись из БД
            file_obj.delete()
            
            # Очищаем кэш
            cache.delete(f"user_stats_{request.user.id}")
            
            logger.info(f"Файл {original_name} (ID: {pk}) удален пользователем {request.user.username}")
            return Response({"status": "deleted", "message": "Файл успешно удален"})
            
        except Exception as e:
            logger.error(f"Ошибка при удалении файла {pk}: {str(e)}")
            return Response({
                "error": "Ошибка при удалении файла",
                "code": "DELETE_ERROR"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ==== Переименование файла ====
class RenameFileView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            file_obj = get_object_or_404(File, pk=pk)
            
            if file_obj.user != request.user and not request.user.is_staff:
                return Response({
                    "detail": "Доступ запрещён",
                    "code": "ACCESS_DENIED"
                }, status=status.HTTP_403_FORBIDDEN)

            # ИСПРАВЛЕНО: проверяем разные варианты ключей
            new_name = request.data.get("name") or request.data.get("new_name") or request.data.get("newName")
            
            if new_name:
                new_name = new_name.strip()
            
            # Валидация нового имени
            if not new_name:
                return Response({
                    "detail": "Имя файла не может быть пустым",
                    "code": "EMPTY_FILENAME"
                }, status=status.HTTP_400_BAD_REQUEST)
                
            if len(new_name) > 255:
                return Response({
                    "detail": "Имя файла слишком длинное",
                    "code": "FILENAME_TOO_LONG"
                }, status=status.HTTP_400_BAD_REQUEST)
                
            # Проверяем на запрещенные символы
            forbidden_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
            if any(char in new_name for char in forbidden_chars):
                return Response({
                    "detail": "Имя файла содержит запрещенные символы",
                    "code": "INVALID_CHARACTERS"
                }, status=status.HTTP_400_BAD_REQUEST)

            old_name = file_obj.original_name
            file_obj.original_name = new_name
            file_obj.save()

            logger.info(f"Файл '{old_name}' переименован в '{new_name}' пользователем {request.user.username}")
            
            # Возвращаем сериализованный объект
            from .serializers import FileSerializer
            return Response(FileSerializer(file_obj, context={'request': request}).data)
            
        except Exception as e:
            logger.error(f"Ошибка при переименовании файла {pk}: {str(e)}")
            return Response({
                "error": "Ошибка при переименовании файла",
                "code": "RENAME_ERROR",
                "details": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==== Изменение комментария ====
class UpdateFileCommentView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            file_obj = get_object_or_404(File, pk=pk)
            
            if file_obj.user != request.user and not request.user.is_staff:
                return Response({
                    "detail": "Доступ запрещён",
                    "code": "ACCESS_DENIED"
                }, status=status.HTTP_403_FORBIDDEN)

            new_comment = request.data.get("comment", "").strip()
            
            if len(new_comment) > 500:
                return Response({
                    "detail": "Комментарий слишком длинный (максимум 500 символов)",
                    "code": "COMMENT_TOO_LONG"
                }, status=status.HTTP_400_BAD_REQUEST)

            file_obj.comment = new_comment
            file_obj.save()
            
            logger.info(f"Комментарий к файлу {file_obj.original_name} изменён пользователем {request.user.username}")
            return Response(FileSerializer(file_obj, context={'request': request}).data)
            
        except Exception as e:
            logger.error(f"Ошибка при обновлении комментария файла {pk}: {str(e)}")
            return Response({
                "error": "Ошибка при обновлении комментария",
                "code": "COMMENT_UPDATE_ERROR"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ==== Скачивание файла ====
class DownloadFileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            file_obj = get_object_or_404(File, pk=pk)
            
            if file_obj.user != request.user and not request.user.is_staff:
                return Response({
                    "detail": "Доступ запрещён",
                    "code": "ACCESS_DENIED"
                }, status=status.HTTP_403_FORBIDDEN)

            file_path = Path(settings.MEDIA_ROOT) / file_obj.stored_name
            
            if not file_path.exists():
                logger.warning(f"Файл не найден на диске: {file_path}")
                return Response({
                    "detail": "Файл не найден на диске",
                    "code": "FILE_NOT_FOUND"
                }, status=status.HTTP_404_NOT_FOUND)

            # Обновляем время последнего скачивания
            file_obj.last_download = timezone.now()
            file_obj.save(update_fields=['last_download'])
            
            logger.info(f"Файл {file_obj.original_name} скачан пользователем {request.user.username}")
            
            # Используем context manager для безопасного открытия файла
            response = FileResponse(
                open(file_path, 'rb'),
                as_attachment=True,
                filename=file_obj.original_name
            )
            response['Content-Length'] = file_path.stat().st_size
            return response
            
        except Exception as e:
            logger.error(f"Ошибка при скачивании файла {pk}: {str(e)}")
            return Response({
                "error": "Ошибка при скачивании файла",
                "code": "DOWNLOAD_ERROR"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ==== Скачивание по публичной ссылке ====
class PublicDownloadView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def get(self, request, public_link):
        try:
            file_obj = get_object_or_404(File, public_link=public_link)
            file_path = Path(settings.MEDIA_ROOT) / file_obj.stored_name
            
            if not file_path.exists():
                logger.warning(f"Публичный файл не найден: {file_path}")
                raise Http404("Файл не найден")

            # Обновляем счетчик скачиваний
            file_obj.last_download = timezone.now()
            file_obj.save(update_fields=['last_download'])
            
            logger.info(f"Файл {file_obj.original_name} скачан по публичной ссылке")
            
            response = FileResponse(
                open(file_path, 'rb'),
                as_attachment=True,
                filename=file_obj.original_name
            )
            response['Content-Length'] = file_path.stat().st_size
            return response
            
        except Http404:
            raise
        except Exception as e:
            logger.error(f"Ошибка при публичном скачивании {public_link}: {str(e)}")
            raise Http404("Файл не найден")

# ==== Админские эндпоинты ====
class AdminUserListView(APIView):
    permission_classes = [IsAdminUser]
    throttle_classes = [AdminActionThrottle]

    def get(self, request):
        try:
            users_qs = User.objects.annotate(
                file_count=Count('file'),
                total_size=Sum('file__size')
            ).select_related()
            
            # Фильтрация
            is_active = request.GET.get('is_active')
            if is_active is not None:
                users_qs = users_qs.filter(is_active=is_active.lower() == 'true')
            
            is_staff = request.GET.get('is_staff')
            if is_staff is not None:
                users_qs = users_qs.filter(is_staff=is_staff.lower() == 'true')
            
            # Сортировка
            ordering = request.GET.get('ordering', '-date_joined')
            users_qs = users_qs.order_by(ordering)
            
            serializer = AdminUserSerializer(users_qs, many=True)
            
            return Response({
                'count': users_qs.count(),
                'users': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Ошибка при получении списка пользователей: {str(e)}")
            return Response({
                "error": "Ошибка сервера",
                "code": "SERVER_ERROR"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AdminUserUpdateView(APIView):
    permission_classes = [IsAdminUser]
    throttle_classes = [AdminActionThrottle]

    def patch(self, request, user_id):
        try:
            user = get_object_or_404(User, pk=user_id)
            
            # Предотвращаем изменение прав самого себя
            if user.id == request.user.id:
                return Response({
                    "detail": "Нельзя изменять свои собственные права",
                    "code": "SELF_MODIFICATION_DENIED"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            updated_fields = []
            
            # Обновляем различные поля
            if 'is_staff' in request.data:
                user.is_staff = bool(request.data['is_staff'])
                updated_fields.append('is_staff')
                
            if 'is_superuser' in request.data:
                user.is_superuser = bool(request.data['is_superuser'])
                updated_fields.append('is_superuser')
                
            if 'is_active' in request.data:
                user.is_active = bool(request.data['is_active'])
                updated_fields.append('is_active')
            
            if updated_fields:
                user.save(update_fields=updated_fields)
                
            logger.info(f"Пользователь {user.username} обновлен админом {request.user.username}: {updated_fields}")
            
            return Response({
                "status": "updated", 
                "user_id": user.id,
                "updated_fields": updated_fields,
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
                "is_active": user.is_active
            })
            
        except Exception as e:
            logger.error(f"Ошибка при обновлении пользователя {user_id}: {str(e)}")
            return Response({
                "error": "Ошибка при обновлении пользователя",
                "code": "USER_UPDATE_ERROR"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AdminUserDeleteView(APIView):
    permission_classes = [IsAdminUser]
    throttle_classes = [AdminActionThrottle]

    @transaction.atomic
    def delete(self, request, user_id):
        try:
            user = get_object_or_404(User, pk=user_id)
            
            # Предотвращаем удаление самого себя
            if user.id == request.user.id:
                return Response({
                    "detail": "Нельзя удалить самого себя",
                    "code": "SELF_DELETE_DENIED"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Предотвращаем удаление суперпользователей обычными админами
            if user.is_superuser and not request.user.is_superuser:
                return Response({
                    "detail": "Недостаточно прав для удаления суперпользователя",
                    "code": "INSUFFICIENT_PERMISSIONS"
                }, status=status.HTTP_403_FORBIDDEN)
            
            username = user.username
            
            # Удаляем файлы пользователя
            files = File.objects.filter(user=user)
            deleted_files_count = 0
            
            for f in files:
                file_path = Path(settings.MEDIA_ROOT) / f.stored_name
                if file_path.exists():
                    try:
                        file_path.unlink()
                        deleted_files_count += 1
                    except OSError as e:
                        logger.warning(f"Не удалось удалить файл {file_path}: {str(e)}")
                        
            files.delete()
            
            # Удаляем пользователя
            user.delete()
            
            # Очищаем кэш
            cache.delete(f"user_stats_{user_id}")
            
            logger.info(f"Пользователь {username} и {deleted_files_count} его файлов удалены администратором {request.user.username}")
            
            return Response({
                "status": "deleted", 
                "user_id": user_id,
                "username": username,
                "deleted_files": deleted_files_count
            })
            
        except Exception as e:
            logger.error(f"Ошибка при удалении пользователя {user_id}: {str(e)}")
            return Response({
                "error": "Ошибка при удалении пользователя",
                "code": "USER_DELETE_ERROR"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AdminUserFilesView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, user_id):
        try:
            user = get_object_or_404(User, pk=user_id)
            files = File.objects.filter(user=user).order_by('-upload_at')
            
            serializer = FileSerializer(files, many=True, context={'request': request})
            
            return Response({
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email
                },
                'count': files.count(),
                'files': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Ошибка при получении файлов пользователя {user_id}: {str(e)}")
            return Response({
                "error": "Ошибка сервера",
                "code": "SERVER_ERROR"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ==== Проверка здоровья API ====
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Расширенная проверка работоспособности API"""
    try:
        # Проверяем подключение к БД
        user_count = User.objects.count()
        file_count = File.objects.count()
        
        # Проверяем файловую систему
        media_root = Path(settings.MEDIA_ROOT)
        storage_available = media_root.exists() and media_root.is_dir()
        
        status_data = {
            'status': 'ok',
            'message': 'MyCloud API is running',
            'timestamp': timezone.now().isoformat(),
            'version': '1.0.0',
            'database': {
                'connected': True,
                'users': user_count,
                'files': file_count
            },
            'storage': {
                'available': storage_available,
                'path': str(media_root)
            },
            'services': {
                'api': 'operational',
                'auth': 'operational',
                'files': 'operational'
            }
        }
        
        return Response(status_data)
        
    except Exception as e:
        logger.error(f"Ошибка health check: {str(e)}")
        return Response({
            'status': 'error',
            'message': 'MyCloud API has issues',
            'timestamp': timezone.now().isoformat(),
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==== ViewSet для управления пользователями ====
from rest_framework import viewsets

class UserViewSet(viewsets.ModelViewSet):
    """
    CRUD операции для пользователей. Доступно только администраторам.
    """
    queryset = User.objects.all().order_by('id')
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminUser]
    throttle_classes = [AdminActionThrottle]

    def get_permissions(self):
        """
        Настройка прав доступа для разных действий
        """
        if self.action == 'list':
            permission_classes = [IsAdminUser]
        elif self.action == 'retrieve':
            permission_classes = [IsAdminUser]
        elif self.action in ['update', 'partial_update']:
            permission_classes = [IsAdminUser]
        elif self.action == 'destroy':
            permission_classes = [IsAdminUser]
        else:
            permission_classes = [IsAdminUser]
        
        return [permission() for permission in permission_classes]

    def perform_update(self, serializer):
        """
        Дополнительная логика при обновлении пользователя
        """
        # Предотвращаем изменение прав самого себя
        if self.get_object().id == self.request.user.id:
            raise ValidationError("Нельзя изменять свои собственные права")
        
        serializer.save()
        logger.info(f"Пользователь {serializer.instance.username} обновлен админом {self.request.user.username}")

    def perform_destroy(self, instance):
        """
        Дополнительная логика при удалении пользователя
        """
        # Предотвращаем удаление самого себя
        if instance.id == self.request.user.id:
            raise ValidationError("Нельзя удалить самого себя")
        
        # Предотвращаем удаление суперпользователей обычными админами
        if instance.is_superuser and not self.request.user.is_superuser:
            raise ValidationError("Недостаточно прав для удаления суперпользователя")
        
        username = instance.username
        
        # Удаляем файлы пользователя
        files = File.objects.filter(user=instance)
        for f in files:
            file_path = Path(settings.MEDIA_ROOT) / f.stored_name
            if file_path.exists():
                try:
                    file_path.unlink()
                except OSError as e:
                    logger.warning(f"Не удалось удалить файл {file_path}: {str(e)}")
        
        files.delete()
        instance.delete()
        
        logger.info(f"Пользователь {username} удален администратором {self.request.user.username}")


# ==== Класс-обертка для current_user_view (для совместимости) ====
class CurrentUserView(APIView):
    """API класс для получения данных текущего пользователя"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        return current_user_view(request)
