from django.contrib.auth.models import User
from django.db import models
import uuid
import mimetypes
from django.conf import settings
import os


class File(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    original_name = models.CharField(max_length=255)
    stored_name = models.CharField(max_length=255, unique=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    last_download = models.DateTimeField(null=True, blank=True)
    size = models.BigIntegerField()
    comment = models.TextField(blank=True)
    public_link = models.CharField(
        max_length=128,
        null=True,
        blank=True,
        unique=True
    )
    file_path = models.CharField(max_length=255)

    # Дополнительные поля согласно требованиям
    mime_type = models.CharField(max_length=100, blank=True)
    download_count = models.IntegerField(default=0)
    is_public = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.public_link:
            self.public_link = uuid.uuid4().hex
        if not self.mime_type and self.original_name:
            self.mime_type, _ = mimetypes.guess_type(self.original_name)
        super().save(*args, **kwargs)

    def get_file_path(self):
        return os.path.join(settings.MEDIA_ROOT, self.file_path)

    def get_public_url(self):
        return f"/api/files/public/{self.public_link}/"

    def __str__(self):
        return f"{self.original_name} ({self.user.username})"
