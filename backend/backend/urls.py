"""
AFYA1 HMIS — afya1/urls.py
Main project URL configuration.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse


def api_root(request):
    return JsonResponse({
        'system': 'AFYA1 HMIS',
        'hospital': 'South B Hospital',
        'version': '1.0.0',
        'api_base': '/api/',
        'admin': '/admin/',
        'docs': '/api/',          # DRF browsable API
    })


def health_check(request):
    return JsonResponse({'status': 'ok', 'system': 'AFYA1 HMIS'})


urlpatterns = [
    # ── System ────────────────────────────────────────────────────────────────
    path('',            api_root,           name='root'),
    path('health/',     health_check,       name='health-check'),

    # ── Django Admin ──────────────────────────────────────────────────────────
    path('admin/',      admin.site.urls,    name='admin'),

    # ── API ───────────────────────────────────────────────────────────────────
    path('api/',        include('core.urls')),

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


