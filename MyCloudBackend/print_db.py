import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mycloud.settings')

from django.conf import settings

print(settings.DATABASES)