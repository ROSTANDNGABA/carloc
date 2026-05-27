"""
URL configuration for gestionlocationbackend project.
"""
import os

from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

from api.monitoring.views import PrometheusMetricsView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('metrics', PrometheusMetricsView.as_view(), name='prometheus-metrics'),
]

# Médias (photos véhicules, documents clients) en local
urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]

# CSS/JS de l'admin Django — indispensable sinon l'interface paraît « cassée »
_serve_static = settings.DEBUG or os.environ.get(
    'CARLOC_SERVE_STATIC', ''
).lower() in ('1', 'true', 'yes', 'on')
if _serve_static:
    from django.contrib.staticfiles.urls import staticfiles_urlpatterns

    urlpatterns += staticfiles_urlpatterns()
