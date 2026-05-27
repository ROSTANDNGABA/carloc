"""Compteurs Prometheus pour les tâches Celery."""

from celery.signals import task_failure, task_postrun, task_prerun

_task_start = {}


@task_prerun.connect
def _celery_task_prerun(sender=None, task_id=None, **kwargs):
    if task_id:
        _task_start[task_id] = True


@task_postrun.connect
def _celery_task_success(sender=None, task_id=None, state=None, **kwargs):
    from django.conf import settings

    if not getattr(settings, 'PROMETHEUS_ENABLED', False):
        return
    if state == 'SUCCESS' and sender:
        from .prometheus import record_celery_task

        record_celery_task(sender.name, 'success')
    if task_id:
        _task_start.pop(task_id, None)


@task_failure.connect
def _celery_task_failure(sender=None, task_id=None, **kwargs):
    from django.conf import settings

    if not getattr(settings, 'PROMETHEUS_ENABLED', False):
        return
    if sender:
        from .prometheus import record_celery_task

        record_celery_task(sender.name, 'failure')
    if task_id:
        _task_start.pop(task_id, None)
