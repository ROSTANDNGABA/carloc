"""Enqueue Celery ou exécution synchrone (tests / dev sans Redis)."""

from django.conf import settings


def enqueue_task(task, *args, **kwargs):
    if getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False):
        return task(*args, **kwargs)
    return task.delay(*args, **kwargs)
