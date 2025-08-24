import re
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import File

# Подключаем модель пользователя (стандартная или кастомная)
User = get_user_model()


# ==== Сериализатор для файлов ====
class FileSerializer(serializers.ModelSerializer):
    class Meta:
        model = File
        fields = '__all__'


# ==== Сериализатор регистрации пользователя с валидацией ====
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ('username', 'first_name', 'email', 'password')

    def validate_username(self, value):
        """
        Логин: только латиница и цифры, начинается с буквы, длина 4-20 символов
        """
        if not re.match(r'^[A-Za-z][A-Za-z0-9]{3,19}$', value):
            raise serializers.ValidationError(
                "Логин: только латинские буквы и цифры, первый символ — буква, длина 4–20 знаков."
            )
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Пользователь с таким логином уже существует.")
        return value

    def validate_email(self, value):
        """
        Email: должен быть уникальным и в правильном формате
        """
        if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', value):
            raise serializers.ValidationError("Введите корректный адрес email.")
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Пользователь с таким email уже зарегистрирован.")
        return value

    def validate_password(self, value):
        """
        Пароль: >= 6 символов, хотя бы 1 заглавная буква, 1 цифра, 1 спецсимвол
        """
        if len(value) < 6:
            raise serializers.ValidationError("Пароль должен быть не менее 6 символов.")
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError("Пароль должен содержать хотя бы одну заглавную букву.")
        if not re.search(r'\d', value):
            raise serializers.ValidationError("Пароль должен содержать хотя бы одну цифру.")
        if not re.search(r'[^A-Za-z0-9]', value):
            raise serializers.ValidationError("Пароль должен содержать хотя бы один специальный символ.")
        return value

    def create(self, validated_data):
        """
        Создание пользователя с зашифрованным паролем
        """
        user = User.objects.create_user(
            username=validated_data['username'],
            first_name=validated_data.get('first_name', ''),
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user
