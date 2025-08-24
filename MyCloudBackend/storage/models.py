from django.contrib.auth.models import User
from django.db import models
import uuid

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

    def save(self, *args, **kwargs):
        if not self.public_link:
            self.public_link = uuid.uuid4().hex
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.original_name} ({self.user.username})"
