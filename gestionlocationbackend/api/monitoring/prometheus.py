"""Métriques Prometheus pour l'API CarLoc."""

import time

from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

HTTP_REQUESTS_TOTAL = Counter(
    "carloc_http_requests_total",
    "Nombre total de requêtes HTTP",
    ["method", "view", "status"],
)

HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "carloc_http_request_duration_seconds",
    "Durée des requêtes HTTP en secondes",
    ["method", "view"],
    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0),
)

CELERY_TASKS_TOTAL = Counter(
    "carloc_celery_tasks_total",
    "Tâches Celery exécutées",
    ["task", "status"],
)


def record_http_request(
    method: str, view: str, status: str, duration_seconds: float
) -> None:
    HTTP_REQUESTS_TOTAL.labels(method=method, view=view, status=status).inc()
    HTTP_REQUEST_DURATION_SECONDS.labels(method=method, view=view).observe(
        duration_seconds
    )


def record_celery_task(task_name: str, status: str) -> None:
    CELERY_TASKS_TOTAL.labels(task=task_name, status=status).inc()


def metrics_payload() -> bytes:
    return generate_latest()


def metrics_content_type() -> str:
    return CONTENT_TYPE_LATEST


class PrometheusRequestTimer:
    """Context manager pour mesurer une requête HTTP."""

    def __init__(self, method: str, view: str):
        self.method = method
        self.view = view
        self._start = 0.0

    def __enter__(self):
        self._start = time.perf_counter()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.perf_counter() - self._start
        status = "500" if exc_type else "200"
        record_http_request(self.method, self.view, status, duration)
        return False
