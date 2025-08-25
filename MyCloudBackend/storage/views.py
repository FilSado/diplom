import os
import uuid
import logging
from django.conf import settings
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.http import FileResponse
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework_simplejwt.tokens import RefreshToken

from .models import File
from .serializers import FileSerializer, RegisterSerializer

logger = logging.getLogger(__name__)
User = get_user_model()

# ==== Регистрация ====
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

# ==== Logout ====
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if not refresh_token:
                return Response({"detail": "Refresh token required."}, status=status.HTTP_400_BAD_REQUEST)
            token = RefreshToken(refresh_token)
            token.blacklist()
            logger.info(f"Пользователь {request.user.username} вышел из системы (logout).")
            return Response({"detail": "Logged out successfully."}, status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            logger.error(f"Ошибка при logout пользователя {request.user.username}: {str(e)}")
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

# ==== Список файлов пользователя ====
class FileListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        files = File.objects.filter(user=request.user)
        serializer = FileSerializer(files, many=True)
        return Response(serializer.data)

# ==== Загрузка файла ====
class FileUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        uploaded = request.FILES.get('file')
        if not uploaded:
            return Response({"error": "Файл не прикреплён"}, status=status.HTTP_400_BAD_REQUEST)

        comment = request.data.get('comment', '')
        os.makedirs(settings.MEDIA_ROOT, exist_ok=True)

        _, ext = os.path.splitext(uploaded.name)
        stored_name = f"{request.user.id}_{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(settings.MEDIA_ROOT, stored_name)

        file_obj = File.objects.create(
            user=request.user,
            original_name=uploaded.name,
            stored_name=stored_name,
            size=uploaded.size,
            comment=comment,
            public_link=uuid.uuid4().hex,
            file_path=os.path.join('uploads', stored_name)
        )

        with open(file_path, 'wb+') as destination:
            for chunk in uploaded.chunks():
                destination.write(chunk)

        logger.info(f"Пользователь {request.user.username} загрузил файл {uploaded.name}")
        return Response(FileSerializer(file_obj).data, status=status.HTTP_201_CREATED)

# ==== Удаление файла ====
class FileDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        file = get_object_or_404(File, pk=pk)
        if file.user != request.user and not request.user.is_staff:
            return Response({"detail": "Доступ запрещён"}, status=status.HTTP_403_FORBIDDEN)

        abs_path = os.path.join(settings.MEDIA_ROOT, file.stored_name)
        if os.path.exists(abs_path):
            os.remove(abs_path)

        file.delete()
        logger.info(f"Файл {pk} удален пользователем {request.user.username}")
        return Response({"status": "deleted"})

# ==== Переименование файла ====
class RenameFileView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        file_obj = get_object_or_404(File, pk=pk)
        if file_obj.user != request.user and not request.user.is_staff:
            return Response({"detail": "Доступ запрещён"}, status=status.HTTP_403_FORBIDDEN)

        new_filename = request.data.get("new_filename")
        if not new_filename or "/" in new_filename or "\\" in new_filename:
            return Response({"detail": "Некорректное имя файла"}, status=status.HTTP_400_BAD_REQUEST)

        old_abs_path = os.path.join(settings.MEDIA_ROOT, file_obj.stored_name)
        _, ext = os.path.splitext(new_filename)
        stored_name = f"{file_obj.user.id}_{uuid.uuid4().hex}{ext}"
        new_abs_path = os.path.join(settings.MEDIA_ROOT, stored_name)

        if os.path.exists(old_abs_path):
            os.rename(old_abs_path, new_abs_path)

        file_obj.original_name = new_filename
        file_obj.stored_name = stored_name
        file_obj.save()

        logger.info(f"Файл {pk} переименован пользователем {request.user.username} в {new_filename}")
        return Response(FileSerializer(file_obj).data)

# ==== Изменение комментария ====
class UpdateFileCommentView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        file_obj = get_object_or_404(File, pk=pk)
        if file_obj.user != request.user and not request.user.is_staff:
            return Response({"detail": "Доступ запрещён"}, status=status.HTTP_403_FORBIDDEN)

        new_comment = request.data.get("comment", "").strip()
        if len(new_comment) > 500:
            return Response({"detail": "Комментарий слишком длинный"}, status=status.HTTP_400_BAD_REQUEST)

        file_obj.comment = new_comment
        file_obj.save()
        logger.info(f"Комментарий к файлу {pk} изменён пользователем {request.user.username}")
        return Response(FileSerializer(file_obj).data)

# ==== Скачивание файла ====
class DownloadFileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        file_obj = get_object_or_404(File, pk=pk)
        if file_obj.user != request.user and not request.user.is_staff:
            return Response({"detail": "Доступ запрещён"}, status=status.HTTP_403_FORBIDDEN)

        file_path = os.path.join(settings.MEDIA_ROOT, file_obj.stored_name)
        if not os.path.exists(file_path):
            return Response({"detail": "Файл не найден"}, status=status.HTTP_404_NOT_FOUND)

        file_obj.last_download = timezone.now()
        file_obj.save()
        logger.info(f"Файл {pk} скачан пользователем {request.user.username}")
        return FileResponse(open(file_path, 'rb'), as_attachment=True, filename=file_obj.original_name)

# ==== Скачивание по публичной ссылке ====
class PublicDownloadView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, public_link):
        file_obj = get_object_or_404(File, public_link=public_link)
        file_path = os.path.join(settings.MEDIA_ROOT, file_obj.stored_name)
        if not os.path.exists(file_path):
            return Response({"detail": "Файл не найден"}, status=status.HTTP_404_NOT_FOUND)

        file_obj.last_download = timezone.now()
        file_obj.save()
        logger.info(f"Файл {file_obj.pk} скачан по публичной ссылке")
        return FileResponse(open(file_path, 'rb'), as_attachment=True, filename=file_obj.original_name)

# ====== АДМИНСКИЕ ЭНДПОИНТЫ ======
class AdminUserListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        users = User.objects.annotate(
            file_count=Count('file'),
            total_size=Sum('file__size')
        ).values('id', 'username', 'email', 'is_staff', 'file_count', 'total_size')
        return Response(list(users))

class AdminUserUpdateView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        is_staff_val = request.data.get('is_staff')
        if is_staff_val is None:
            return Response({"detail": "Необходимо передать is_staff"}, status=status.HTTP_400_BAD_REQUEST)
        user.is_staff = bool(is_staff_val)
        user.save()
        return Response({"status": "updated", "user_id": user.id, "is_staff": user.is_staff})

class AdminUserDeleteView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        files = File.objects.filter(user=user)
        for f in files:
            file_path = os.path.join(settings.MEDIA_ROOT, f.stored_name)
            if os.path.exists(file_path):
                os.remove(file_path)
        files.delete()
        user.delete()
        logger.info(f"Пользователь {user.username} и его файлы удалены администратором {request.user.username}")
        return Response({"status": "deleted", "user_id": user_id})

class AdminUserFilesView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        files = File.objects.filter(user=user)
        return Response(FileSerializer(files, many=True).data)
