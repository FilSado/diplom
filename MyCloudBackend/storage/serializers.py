import re
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import File

# Подключаем модель пользователя (стандартная или кастомная)
User = get_user_model()

# ==== Кастомный сериализатор JWT токенов с данными пользователя ====
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Кастомный сериализатор для включения данных пользователя в ответ при логине
    """
    
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Добавляем данные пользователя к токенам
        user = self.user
        data['user'] = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': user.get_full_name() or user.first_name or user.username,
            'first_name': user.first_name or '',
            'last_name': user.last_name or '',
            'role': 'admin' if (user.is_staff or user.is_superuser) else 'user',
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
            'is_active': user.is_active,
            'avatar': getattr(user, 'avatar', None),  # Безопасный доступ к avatar
            'date_joined': user.date_joined.isoformat() if hasattr(user, 'date_joined') else None,
            'last_login': user.last_login.isoformat() if user.last_login else None,
        }
        
        return data

# ==== Улучшенный сериализатор для файлов ====
class FileSerializer(serializers.ModelSerializer):
    upload_date = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    last_download = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True, allow_null=True)
    public_url = serializers.SerializerMethodField()
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_full_name = serializers.SerializerMethodField(read_only=True)
    formatted_size = serializers.SerializerMethodField()
    file_type = serializers.SerializerMethodField()
    can_preview = serializers.SerializerMethodField()
    
    class Meta:
        model = File
        fields = [
            'id',
            'original_name',
            'stored_name',
            'size',
            'formatted_size',
            'file_type',
            'can_preview',
            'comment',
            'upload_date',
            'last_download',
            'public_url',
            'user_id',
            'user_username',
            'user_full_name'
        ]
        read_only_fields = ['stored_name', 'public_link', 'user_id', 'user_username', 'user_full_name']
    
    def get_user_full_name(self, obj):
        """Получаем полное имя пользователя, загрузившего файл"""
        return obj.user.get_full_name() or obj.user.username
    
    def get_public_url(self, obj):
        """Генерируем полный URL для публичной ссылки"""
        path = f'/api/files/download/public/{obj.public_link}/'
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(path)
        return path

    def get_formatted_size(self, obj):
        """Форматируем размер файла в читаемом виде"""
        size = obj.size
        if size < 1024:
            return f"{size} B"
        elif size < 1024 * 1024:
            return f"{size / 1024:.1f} KB"
        elif size < 1024 * 1024 * 1024:
            return f"{size / (1024 * 1024):.1f} MB"
        else:
            return f"{size / (1024 * 1024 * 1024):.1f} GB"

    def get_file_type(self, obj):
        """Определяем тип файла по расширению"""
        import os
        _, ext = os.path.splitext(obj.original_name.lower())
        type_mapping = {
            '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.gif': 'image',
            '.bmp': 'image', '.svg': 'image', '.webp': 'image', '.ico': 'image',
            '.pdf': 'document', '.doc': 'document', '.docx': 'document',
            '.txt': 'document', '.rtf': 'document', '.odt': 'document',
            '.md': 'document', '.tex': 'document',
            '.xls': 'spreadsheet', '.xlsx': 'spreadsheet', '.csv': 'spreadsheet',
            '.ods': 'spreadsheet',
            '.ppt': 'presentation', '.pptx': 'presentation', '.odp': 'presentation',
            '.mp4': 'video', '.avi': 'video', '.mkv': 'video', '.mov': 'video',
            '.wmv': 'video', '.flv': 'video', '.webm': 'video', '.m4v': 'video',
            '.mp3': 'audio', '.wav': 'audio', '.flac': 'audio', '.aac': 'audio',
            '.ogg': 'audio', '.wma': 'audio', '.m4a': 'audio',
            '.zip': 'archive', '.rar': 'archive', '.7z': 'archive', '.tar': 'archive',
            '.gz': 'archive', '.bz2': 'archive', '.xz': 'archive',
            '.py': 'code', '.js': 'code', '.html': 'code', '.css': 'code',
            '.json': 'code', '.xml': 'code', '.sql': 'code', '.php': 'code',
            '.java': 'code', '.cpp': 'code', '.c': 'code', '.h': 'code',
            '.exe': 'executable', '.msi': 'executable', '.deb': 'executable',
            '.rpm': 'executable', '.dmg': 'executable', '.pkg': 'executable',
        }
        return type_mapping.get(ext, 'file')
    
    def get_can_preview(self, obj):
        """Определяем можно ли предварительно просматривать файл"""
        file_type = self.get_file_type(obj)
        previewable_types = ['image', 'document', 'code']
        return file_type in previewable_types and obj.size < 10 * 1024 * 1024  # До 10MB


# ==== Сериализатор регистрации пользователя с улучшенной валидацией ====
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ('username', 'first_name', 'last_name', 'email', 'password', 'password_confirm')
        extra_kwargs = {
            'first_name': {'required': False, 'allow_blank': True},
            'last_name': {'required': False, 'allow_blank': True},
            'email': {'required': True},
        }

    def validate_username(self, value):
        """
        Логин: только латиница и цифры, начинается с буквы, длина 4-20 символов
        """
        value = value.strip()
        
        if not value:
            raise serializers.ValidationError("Логин не может быть пустым.")
            
        if not re.match(r'^[A-Za-z][A-Za-z0-9_]{3,19}$', value):
            raise serializers.ValidationError(
                "Логин: только латинские буквы, цифры и подчеркивания, "
                "первый символ — буква, длина 4–20 знаков."
            )
            
        # Проверяем на зарезервированные имена
        reserved_names = ['admin', 'root', 'user', 'test', 'api', 'www', 'mail', 'ftp']
        if value.lower() in reserved_names:
            raise serializers.ValidationError("Этот логин зарезервирован системой.")
            
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Пользователь с таким логином уже существует.")
            
        return value

    def validate_email(self, value):
        """
        Email: должен быть уникальным и в правильном формате
        """
        value = value.strip().lower()
        
        if not value:
            raise serializers.ValidationError("Email не может быть пустым.")
        
        # Более строгая валидация email
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, value):
            raise serializers.ValidationError("Введите корректный адрес email.")
            
        # Проверяем на одноразовые email сервисы (опционально)
        disposable_domains = ['10minutemail.com', 'tempmail.org', 'guerrillamail.com']
        domain = value.split('@')[1] if '@' in value else ''
        if domain in disposable_domains:
            raise serializers.ValidationError("Одноразовые email адреса не разрешены.")
            
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Пользователь с таким email уже зарегистрирован.")
            
        return value

    def validate_password(self, value):
        """
        Улучшенная валидация пароля с использованием Django validators
        """
        if len(value) < 6:
            raise serializers.ValidationError("Пароль должен быть не менее 6 символов.")
            
        # Используем встроенные валидаторы Django
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        
        # Дополнительные проверки
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError("Пароль должен содержать хотя бы одну заглавную букву.")
        if not re.search(r'[a-z]', value):
            raise serializers.ValidationError("Пароль должен содержать хотя бы одну строчную букву.")
        if not re.search(r'\d', value):
            raise serializers.ValidationError("Пароль должен содержать хотя бы одну цифру.")
        if not re.search(r'[^A-Za-z0-9]', value):
            raise serializers.ValidationError("Пароль должен содержать хотя бы один специальный символ.")
            
        # Проверяем на простые пароли
        common_passwords = ['password', '123456', 'qwerty', 'abc123']
        if value.lower() in common_passwords:
            raise serializers.ValidationError("Пароль слишком простой.")
            
        return value

    def validate(self, attrs):
        """
        Проверяем совпадение паролей и общую валидацию
        """
        if attrs.get('password') != attrs.get('password_confirm'):
            raise serializers.ValidationError({
                'password_confirm': 'Пароли не совпадают.'
            })
            
        # Проверяем что пароль не содержит части username или email
        username = attrs.get('username', '').lower()
        email = attrs.get('email', '').split('@')[0].lower()
        password = attrs.get('password', '').lower()
        
        if len(username) > 3 and username in password:
            raise serializers.ValidationError({
                'password': 'Пароль не должен содержать части логина.'
            })
            
        if len(email) > 3 and email in password:
            raise serializers.ValidationError({
                'password': 'Пароль не должен содержать части email.'
            })
            
        return attrs

    def create(self, validated_data):
        """
        Создание пользователя с зашифрованным паролем
        """
        # Удаляем password_confirm из данных
        validated_data.pop('password_confirm', None)
        
        user = User.objects.create_user(
            username=validated_data['username'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            email=validated_data['email'],
            password=validated_data['password']
        )
        
        # Можно добавить отправку welcome email здесь
        # send_welcome_email.delay(user.id)  # Celery task
        
        return user

# ==== Сериализатор для обновления профиля пользователя ====
class UserProfileSerializer(serializers.ModelSerializer):
    file_count = serializers.IntegerField(read_only=True)
    total_file_size = serializers.IntegerField(read_only=True)
    full_name = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id',
            'username', 
            'email', 
            'first_name', 
            'last_name',
            'full_name',
            'is_staff',
            'is_superuser', 
            'is_active',
            'date_joined',
            'last_login',
            'file_count',
            'total_file_size'
        ]
        read_only_fields = ['id', 'username', 'date_joined', 'last_login', 'is_staff', 'is_superuser']

    def get_full_name(self, obj):
        """Получаем полное имя пользователя"""
        return obj.get_full_name() or obj.username

    def validate_email(self, value):
        """
        Проверяем уникальность email при обновлении
        """
        value = value.strip().lower()
        
        if self.instance and self.instance.email.lower() == value:
            return value
            
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Пользователь с таким email уже зарегистрирован.")
        return value

# ==== Сериализатор для админской панели ====
class AdminUserSerializer(serializers.ModelSerializer):
    file_count = serializers.IntegerField(read_only=True)
    total_size = serializers.IntegerField(read_only=True)
    full_name = serializers.SerializerMethodField()
    formatted_date_joined = serializers.SerializerMethodField()
    formatted_last_login = serializers.SerializerMethodField()
    formatted_total_size = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email', 
            'first_name',
            'last_name',
            'full_name',
            'is_staff',
            'is_superuser',
            'is_active',
            'date_joined',
            'formatted_date_joined',
            'last_login',
            'formatted_last_login',
            'file_count',
            'total_size',
            'formatted_total_size'
        ]

    def get_full_name(self, obj):
        """Получаем полное имя пользователя"""
        return obj.get_full_name() or obj.username

    def get_formatted_date_joined(self, obj):
        """Форматируем дату регистрации"""
        if obj.date_joined:
            return obj.date_joined.strftime("%Y-%m-%d %H:%M")
        return None

    def get_formatted_last_login(self, obj):
        """Форматируем дату последнего входа"""
        if obj.last_login:
            return obj.last_login.strftime("%Y-%m-%d %H:%M")
        return "Никогда"
    
    def get_formatted_total_size(self, obj):
        """Форматируем общий размер файлов пользователя"""
        total_size = obj.total_size or 0
        if total_size < 1024:
            return f"{total_size} B"
        elif total_size < 1024 * 1024:
            return f"{total_size / 1024:.1f} KB"
        elif total_size < 1024 * 1024 * 1024:
            return f"{total_size / (1024 * 1024):.1f} MB"
        else:
            return f"{total_size / (1024 * 1024 * 1024):.1f} GB"

# ==== Сериализатор для изменения пароля ====
class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, style={'input_type': 'password'})
    new_password = serializers.CharField(required=True, min_length=6, style={'input_type': 'password'})
    new_password_confirm = serializers.CharField(required=True, style={'input_type': 'password'})

    def validate_old_password(self, value):
        """
        Проверяем правильность старого пароля
        """
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Неверный текущий пароль.')
        return value

    def validate_new_password(self, value):
        """
        Валидация нового пароля по тем же правилам что и при регистрации
        """
        user = self.context['request'].user
        
        # Используем встроенные валидаторы Django
        try:
            validate_password(value, user=user)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        
        # Дополнительные проверки
        if len(value) < 6:
            raise serializers.ValidationError("Пароль должен быть не менее 6 символов.")
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError("Пароль должен содержать хотя бы одну заглавную букву.")
        if not re.search(r'[a-z]', value):
            raise serializers.ValidationError("Пароль должен содержать хотя бы одну строчную букву.")
        if not re.search(r'\d', value):
            raise serializers.ValidationError("Пароль должен содержать хотя бы одну цифру.")
        if not re.search(r'[^A-Za-z0-9]', value):
            raise serializers.ValidationError("Пароль должен содержать хотя бы один специальный символ.")
        
        return value

    def validate(self, attrs):
        """
        Проверяем совпадение новых паролей и что новый пароль отличается от старого
        """
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': 'Новые пароли не совпадают.'
            })
            
        if attrs['old_password'] == attrs['new_password']:
            raise serializers.ValidationError({
                'new_password': 'Новый пароль должен отличаться от текущего.'
            })
            
        return attrs

# ==== Сериализатор для обновления комментария файла ====
class UpdateFileCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = File
        fields = ['comment']

    def validate_comment(self, value):
        """
        Ограничиваем длину комментария и проверяем содержимое
        """
        if value and len(value.strip()) > 500:
            raise serializers.ValidationError("Комментарий не может быть длиннее 500 символов.")
        
        # Фильтруем нежелательный контент (опционально)
        forbidden_words = ['spam', 'hack', 'virus']  # Можно расширить
        if value and any(word in value.lower() for word in forbidden_words):
            raise serializers.ValidationError("Комментарий содержит недопустимые слова.")
            
        return value.strip() if value else ''

# ==== Сериализатор для переименования файла ====
class RenameFileSerializer(serializers.ModelSerializer):
    new_name = serializers.CharField(max_length=255, write_only=True)
    
    class Meta:
        model = File
        fields = ['new_name', 'original_name']
        read_only_fields = ['original_name']

    def validate_new_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Имя файла не может быть пустым.")
        
        value = value.strip()
        
        
        forbidden_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|', '\0']
        for char in forbidden_chars:
            if char in value:
                raise serializers.ValidationError(f"Имя файла не должно содержать символ '{char}'.")
        
        # Проверяем длину
        if len(value) > 255:
            raise serializers.ValidationError("Имя файла слишком длинное (максимум 255 символов).")
        
        # Проверяем на зарезервированные имена Windows
        reserved_names = [
            'CON', 'PRN', 'AUX', 'NUL',
            'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
            'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
        ]
        name_without_ext = value.split('.')[0].upper()
        if name_without_ext in reserved_names:
            raise serializers.ValidationError("Это имя файла зарезервировано системой.")
        
        # Проверяем что имя не начинается/заканчивается точкой или пробелом
        if value.startswith('.') or value.endswith('.') or value.startswith(' ') or value.endswith(' '):
            raise serializers.ValidationError("Имя файла не может начинаться или заканчиваться точкой или пробелом.")
            
        return value

# ==== Дополнительные утилитарные сериализаторы ====
class FileStatsSerializer(serializers.Serializer):
    """Сериализатор для статистики файлов"""
    total_files = serializers.IntegerField()
    total_size = serializers.IntegerField()
    formatted_total_size = serializers.CharField()
    file_types = serializers.DictField()
    recent_uploads = serializers.IntegerField()

class UserStatsSerializer(serializers.Serializer):
    """Сериализатор для статистики пользователей"""
    total_users = serializers.IntegerField()
    active_users = serializers.IntegerField()
    new_users_today = serializers.IntegerField()
    admin_users = serializers.IntegerField()
