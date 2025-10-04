from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include, re_path

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Все API маршруты идут через storage.urls
    path('api/', include('storage.urls')),
]

# Поддержка static и media в DEBUG
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# SPA fallback для React приложения
urlpatterns += [
    re_path(r'^(?:.*)/?$', TemplateView.as_view(template_name='index.html')),
]
