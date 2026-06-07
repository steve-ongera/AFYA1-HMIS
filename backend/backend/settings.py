"""
AFYA1 HMIS — afya1/settings.py
South B Hospital Management Information System
Complete Django settings with environment variable support.

Usage:
    Copy .env.example to .env and fill in values.
    Development:  DEBUG=True
    Production:   DEBUG=False  +  set all required env vars
"""

import os
from pathlib import Path
from datetime import timedelta
from decouple import config, Csv

# ── Base Paths ────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent.parent


# ── Security ──────────────────────────────────────────────────────────────────

SECRET_KEY = config(
    'SECRET_KEY',
    default='django-insecure-afya1-hmis-change-this-in-production-!!!'
)

DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = config(
    'ALLOWED_HOSTS',
    default='localhost,127.0.0.1',
    cast=Csv()
)

# CSRF trusted origins (required when behind a reverse proxy)
CSRF_TRUSTED_ORIGINS = config(
    'CSRF_TRUSTED_ORIGINS',
    default='http://localhost:5173,http://localhost:3000',
    cast=Csv()
)


# ── Application Definition ────────────────────────────────────────────────────

DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
]

LOCAL_APPS = [
    'core',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS


# ── Middleware ────────────────────────────────────────────────────────────────

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',        # static files in prod
    'corsheaders.middleware.CorsMiddleware',             # must be before CommonMiddleware
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]


# ── URL & WSGI ────────────────────────────────────────────────────────────────

ROOT_URLCONF = 'afya1.urls'
WSGI_APPLICATION = 'afya1.wsgi.application'
ASGI_APPLICATION = 'afya1.asgi.application'


# ── Templates ─────────────────────────────────────────────────────────────────

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]


# ── Database ──────────────────────────────────────────────────────────────────

DATABASES = {
    'default': {
        'ENGINE':   'django.db.backends.postgresql',
        'NAME':     config('DB_NAME',     default='afya1_hmis'),
        'USER':     config('DB_USER',     default='postgres'),
        'PASSWORD': config('DB_PASSWORD', default='postgres'),
        'HOST':     config('DB_HOST',     default='localhost'),
        'PORT':     config('DB_PORT',     default='5432'),
        'OPTIONS': {
            'connect_timeout': 10,
        },
        'CONN_MAX_AGE': config('DB_CONN_MAX_AGE', default=60, cast=int),
    }
}


# ── Custom User Model ─────────────────────────────────────────────────────────

AUTH_USER_MODEL = 'core.User'


# ── Password Validation ───────────────────────────────────────────────────────

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8},
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# ── Internationalisation ──────────────────────────────────────────────────────

LANGUAGE_CODE = 'en-us'
TIME_ZONE     = 'Africa/Nairobi'
USE_I18N      = True
USE_TZ        = True


# ── Static & Media Files ──────────────────────────────────────────────────────

STATIC_URL   = '/static/'
STATIC_ROOT  = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static'] if (BASE_DIR / 'static').exists() else []

# WhiteNoise compressed static files (production)
STATICFILES_STORAGE = (
    'whitenoise.storage.CompressedManifestStaticFilesStorage'
    if not DEBUG else
    'django.contrib.staticfiles.storage.StaticFilesStorage'
)

MEDIA_URL  = '/media/'
MEDIA_ROOT = BASE_DIR / config('MEDIA_ROOT', default='media')


# ── Default Primary Key ───────────────────────────────────────────────────────

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# ── Django REST Framework ─────────────────────────────────────────────────────

REST_FRAMEWORK = {
    # ── Authentication ────────────────────────────────────────────────────────
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        # Session auth kept for DRF browsable API in development
        'rest_framework.authentication.SessionAuthentication',
    ],

    # ── Permissions ───────────────────────────────────────────────────────────
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],

    # ── Renderers ─────────────────────────────────────────────────────────────
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ] + (['rest_framework.renderers.BrowsableAPIRenderer'] if DEBUG else []),

    # ── Parsers ───────────────────────────────────────────────────────────────
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',   # file / image uploads
        'rest_framework.parsers.FormParser',
    ],

    # ── Filtering ─────────────────────────────────────────────────────────────
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],

    # ── Pagination ────────────────────────────────────────────────────────────
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': config('API_PAGE_SIZE', default=25, cast=int),

    # ── Throttling ────────────────────────────────────────────────────────────
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': config('THROTTLE_ANON',  default='100/hour'),
        'user': config('THROTTLE_USER',  default='2000/hour'),
        'login': config('THROTTLE_LOGIN', default='10/minute'),
    },

    # ── Exception Handling ────────────────────────────────────────────────────
    'EXCEPTION_HANDLER': 'rest_framework.views.exception_handler',

    # ── Datetime ──────────────────────────────────────────────────────────────
    'DATETIME_FORMAT': '%Y-%m-%dT%H:%M:%S',
    'DATE_FORMAT':     '%Y-%m-%d',
}


# ── Simple JWT ────────────────────────────────────────────────────────────────

SIMPLE_JWT = {
    # Token lifetimes
    'ACCESS_TOKEN_LIFETIME':  timedelta(
        minutes=config('JWT_ACCESS_LIFETIME_MINUTES', default=60, cast=int)
    ),
    'REFRESH_TOKEN_LIFETIME': timedelta(
        days=config('JWT_REFRESH_LIFETIME_DAYS', default=7, cast=int)
    ),

    # Rotation & blacklisting
    'ROTATE_REFRESH_TOKENS':   True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN':        True,

    # Algorithm
    'ALGORITHM':        'HS256',
    'SIGNING_KEY':      SECRET_KEY,
    'VERIFYING_KEY':    None,
    'AUDIENCE':         None,
    'ISSUER':           'afya1-hmis',

    # Headers
    'AUTH_HEADER_TYPES':        ('Bearer',),
    'AUTH_HEADER_NAME':         'HTTP_AUTHORIZATION',
    'USER_ID_FIELD':            'id',
    'USER_ID_CLAIM':            'user_id',
    'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',

    # Token types
    'AUTH_TOKEN_CLASSES':  ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM':    'token_type',
    'TOKEN_USER_CLASS':    'rest_framework_simplejwt.models.TokenUser',

    # Sliding tokens (optional)
    'SLIDING_TOKEN_REFRESH_EXP_CLAIM':      'refresh_exp',
    'SLIDING_TOKEN_LIFETIME':               timedelta(minutes=5),
    'SLIDING_TOKEN_REFRESH_LIFETIME':       timedelta(days=1),

    # Custom serializers (use defaults)
    'TOKEN_OBTAIN_SERIALIZER':  'rest_framework_simplejwt.serializers.TokenObtainPairSerializer',
    'TOKEN_REFRESH_SERIALIZER': 'rest_framework_simplejwt.serializers.TokenRefreshSerializer',
    'TOKEN_VERIFY_SERIALIZER':  'rest_framework_simplejwt.serializers.TokenVerifySerializer',
}


# ── CORS ──────────────────────────────────────────────────────────────────────

CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173',
    cast=Csv()
)

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_METHODS = [
    'DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept', 'accept-encoding', 'authorization', 'content-type',
    'dnt', 'origin', 'user-agent', 'x-csrftoken', 'x-requested-with',
]

# Allow all origins in development
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True


# ── Caching ───────────────────────────────────────────────────────────────────

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': config('REDIS_URL', default='redis://127.0.0.1:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'afya1',
        'TIMEOUT': 300,
    }
} if config('USE_REDIS_CACHE', default=False, cast=bool) else {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'afya1-hmis-cache',
    }
}


# ── Session ───────────────────────────────────────────────────────────────────

SESSION_ENGINE         = 'django.contrib.sessions.backends.db'
SESSION_COOKIE_AGE     = 86400        # 24 hours
SESSION_COOKIE_SECURE  = not DEBUG    # HTTPS only in production
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'


# ── Security Headers (production) ────────────────────────────────────────────

if not DEBUG:
    SECURE_BROWSER_XSS_FILTER       = True
    SECURE_CONTENT_TYPE_NOSNIFF     = True
    SECURE_HSTS_SECONDS             = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS  = True
    SECURE_HSTS_PRELOAD             = True
    SECURE_SSL_REDIRECT             = config('SECURE_SSL_REDIRECT', default=True, cast=bool)
    SESSION_COOKIE_SECURE           = True
    CSRF_COOKIE_SECURE              = True
    X_FRAME_OPTIONS                 = 'DENY'


# ── Logging ───────────────────────────────────────────────────────────────────

LOG_LEVEL = config('LOG_LEVEL', default='INFO')
LOGS_DIR  = BASE_DIR / 'logs'
LOGS_DIR.mkdir(exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,

    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {asctime} {message}',
            'style': '{',
        },
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(levelname)s %(asctime)s %(module)s %(message)s',
        } if config('USE_JSON_LOGGING', default=False, cast=bool) else {
            'format': '{levelname} {asctime} {message}',
            'style': '{',
        },
    },

    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
    },

    'handlers': {
        'console': {
            'class':     'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file_general': {
            'class':       'logging.handlers.RotatingFileHandler',
            'filename':    LOGS_DIR / 'afya1.log',
            'maxBytes':    10 * 1024 * 1024,   # 10 MB
            'backupCount': 5,
            'formatter':   'verbose',
        },
        'file_errors': {
            'class':       'logging.handlers.RotatingFileHandler',
            'filename':    LOGS_DIR / 'errors.log',
            'maxBytes':    10 * 1024 * 1024,
            'backupCount': 5,
            'formatter':   'verbose',
            'level':       'ERROR',
        },
        'file_security': {
            'class':       'logging.handlers.RotatingFileHandler',
            'filename':    LOGS_DIR / 'security.log',
            'maxBytes':    5 * 1024 * 1024,
            'backupCount': 10,
            'formatter':   'verbose',
        },
    },

    'loggers': {
        'django': {
            'handlers':  ['console', 'file_general'],
            'level':     LOG_LEVEL,
            'propagate': True,
        },
        'django.request': {
            'handlers':  ['file_errors'],
            'level':     'ERROR',
            'propagate': False,
        },
        'django.security': {
            'handlers':  ['file_security'],
            'level':     'WARNING',
            'propagate': False,
        },
        'core': {
            'handlers':  ['console', 'file_general'],
            'level':     LOG_LEVEL,
            'propagate': False,
        },
    },

    'root': {
        'handlers': ['console'],
        'level':    LOG_LEVEL,
    },
}


# ── Email ─────────────────────────────────────────────────────────────────────

EMAIL_BACKEND = config(
    'EMAIL_BACKEND',
    default='django.core.mail.backends.console.EmailBackend'
)
EMAIL_HOST          = config('EMAIL_HOST',          default='smtp.gmail.com')
EMAIL_PORT          = config('EMAIL_PORT',          default=587,   cast=int)
EMAIL_USE_TLS       = config('EMAIL_USE_TLS',       default=True,  cast=bool)
EMAIL_HOST_USER     = config('EMAIL_HOST_USER',     default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL  = config('DEFAULT_FROM_EMAIL',  default='AFYA1 HMIS <noreply@southb.hospital>')
SERVER_EMAIL        = DEFAULT_FROM_EMAIL


# ── File Upload ───────────────────────────────────────────────────────────────

FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024   # 10 MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
MAX_UPLOAD_SIZE             = 10 * 1024 * 1024

# Allowed image/document types
ALLOWED_IMAGE_TYPES  = ['image/jpeg', 'image/png', 'image/webp']
ALLOWED_DOCUMENT_TYPES = ['application/pdf']


# ── Celery (optional — async eTIMS/SHA submission) ────────────────────────────

CELERY_BROKER_URL         = config('REDIS_URL', default='redis://127.0.0.1:6379/0')
CELERY_RESULT_BACKEND     = config('REDIS_URL', default='redis://127.0.0.1:6379/0')
CELERY_ACCEPT_CONTENT     = ['json']
CELERY_TASK_SERIALIZER    = 'json'
CELERY_RESULT_SERIALIZER  = 'json'
CELERY_TIMEZONE           = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT    = 30 * 60   # 30 minutes


# ── SHA Integration ───────────────────────────────────────────────────────────

SHA_API_BASE_URL    = config('SHA_API_BASE_URL',    default='https://api.sha.go.ke/v1')
SHA_API_KEY         = config('SHA_API_KEY',         default='')
SHA_FACILITY_CODE   = config('SHA_FACILITY_CODE',   default='')
SHA_TEST_MODE       = config('SHA_TEST_MODE',       default=True,  cast=bool)
SHA_TIMEOUT_SECONDS = config('SHA_TIMEOUT_SECONDS', default=30,   cast=int)


# ── eTIMS Integration ─────────────────────────────────────────────────────────

ETIMS_API_BASE_URL  = config('ETIMS_API_BASE_URL',  default='https://etims.kra.go.ke/api')
ETIMS_TEST_URL      = config('ETIMS_TEST_URL',      default='https://etims-dev.kra.go.ke/api')
ETIMS_TEST_MODE     = config('ETIMS_TEST_MODE',     default=True,  cast=bool)
ETIMS_TIMEOUT       = config('ETIMS_TIMEOUT',       default=30,   cast=int)


# ── M-Pesa / Daraja Integration ───────────────────────────────────────────────

MPESA_CONSUMER_KEY      = config('MPESA_CONSUMER_KEY',      default='')
MPESA_CONSUMER_SECRET   = config('MPESA_CONSUMER_SECRET',   default='')
MPESA_SHORTCODE         = config('MPESA_SHORTCODE',         default='')
MPESA_PASSKEY           = config('MPESA_PASSKEY',           default='')
MPESA_CALLBACK_URL      = config('MPESA_CALLBACK_URL',      default='')
MPESA_ENVIRONMENT       = config('MPESA_ENVIRONMENT',       default='sandbox')   # sandbox | production


# ── Hospital Settings ─────────────────────────────────────────────────────────

HOSPITAL_NAME    = config('HOSPITAL_NAME',    default='South B Hospital')
HOSPITAL_LEVEL   = config('HOSPITAL_LEVEL',   default='Level 5')
HOSPITAL_ADDRESS = config('HOSPITAL_ADDRESS', default='South B, Nairobi, Kenya')
HOSPITAL_PHONE   = config('HOSPITAL_PHONE',   default='+254 700 000 000')
HOSPITAL_EMAIL   = config('HOSPITAL_EMAIL',   default='info@southb.hospital')

# Admin panel branding
ADMIN_SITE_HEADER  = f'{HOSPITAL_NAME} — AFYA1 HMIS'
ADMIN_SITE_TITLE   = 'AFYA1 HMIS Admin'
ADMIN_INDEX_TITLE  = 'Hospital Management Portal'


# ── Django Admin Branding ─────────────────────────────────────────────────────

from django.contrib import admin as _admin
_admin.site.site_header  = ADMIN_SITE_HEADER
_admin.site.site_title   = ADMIN_SITE_TITLE
_admin.site.index_title  = ADMIN_INDEX_TITLE


# ── Development Overrides ─────────────────────────────────────────────────────

if DEBUG:
    # Django Debug Toolbar (install separately: pip install django-debug-toolbar)
    try:
        import debug_toolbar  # noqa
        INSTALLED_APPS  += ['debug_toolbar']
        MIDDLEWARE       = ['debug_toolbar.middleware.DebugToolbarMiddleware'] + MIDDLEWARE
        INTERNAL_IPS     = ['127.0.0.1', 'localhost']
    except ImportError:
        pass

    # Relax throttling in dev
    REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
        'anon':  '10000/hour',
        'user':  '100000/hour',
        'login': '1000/minute',
    }

