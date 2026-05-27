"""Middleware Prometheus — compteurs et latence par requête."""

import time

from django.conf import settings

from .prometheus import record_http_request


class PrometheusMiddleware:
    """Enregistre method / vue / statut / durée pour chaque requête HTTP."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not getattr(settings, 'PROMETHEUS_ENABLED', False):
            return self.get_response(request)

        path = request.path
        if path == '/metrics' or path.endswith('/health/'):
            return self.get_response(request)

        view_name = 'unknown'
        if request.resolver_match is not None:
            view_name = request.resolver_match.view_name or request.resolver_match.url_name or 'unknown'

        start = time.perf_counter()
        response = self.get_response(request)
        duration = time.perf_counter() - start

        record_http_request(
            method=request.method,
            view=view_name,
            status=str(response.status_code),
            duration_seconds=duration,
        )
        return response
