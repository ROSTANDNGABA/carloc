from django.apps import AppConfig
from django.db.models.signals import post_migrate


class ApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "api"
    verbose_name = "Gestion CarLoc"

    def ready(self):
        """Enregistre les signaux Django quand l'app est prête"""
        from django.conf import settings

        from . import audit_signals  # noqa

        post_migrate.connect(ensure_superadmin_from_env, sender=self)

        if getattr(settings, "PROMETHEUS_ENABLED", False):
            from .monitoring import celery_signals  # noqa


def ensure_superadmin_from_env(sender, **kwargs):
    import os

    email = os.environ.get("CARLOC_ADMIN_EMAIL", "").strip()
    username = os.environ.get("CARLOC_ADMIN_USERNAME", email).strip()
    password = os.environ.get("CARLOC_ADMIN_PASSWORD", "").strip()

    if not username or not password:
        return

    from django.contrib.auth.models import User

    user, _ = User.objects.get_or_create(username=username, defaults={"email": email})
    user.email = email
    user.is_staff = True
    user.is_superuser = True
    user.is_active = True
    user.set_password(password)
    user.save(
        update_fields=["email", "is_staff", "is_superuser", "is_active", "password"]
    )
