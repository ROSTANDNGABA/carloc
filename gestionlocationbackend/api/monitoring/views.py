"""Endpoints monitoring : santé, métriques Prometheus, test Sentry."""

from django.conf import settings
from django.db import connection
from django.http import HttpResponse
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiResponse

from api.permissions import IsAdminUser

from .prometheus import metrics_content_type, metrics_payload


class HealthCheckView(APIView):
    """Sonde de santé pour load balancers et orchestrateurs."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    @extend_schema(
        summary="Health Check",
        description="Vérifie l'état de santé de l'application (BDD, services)",
        responses={
            200: OpenApiResponse(
                description="Service en bonne santé",
                response={
                    "type": "object",
                    "properties": {
                        "status": {"type": "string", "enum": ["ok", "degraded"]},
                        "database": {"type": "string"},
                        "debug": {"type": "boolean"},
                    },
                },
            ),
            503: OpenApiResponse(description="Service dégradé"),
        },
        tags=["Monitoring"],
    )
    def get(self, request):
        db_ok = True
        db_error = ""
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except Exception as exc:
            db_ok = False
            db_error = str(exc)

        payload = {
            "status": "ok" if db_ok else "degraded",
            "database": "ok" if db_ok else "error",
            "debug": settings.DEBUG,
        }
        if db_error and settings.DEBUG:
            payload["database_error"] = db_error

        http_status = (
            status.HTTP_200_OK if db_ok else status.HTTP_503_SERVICE_UNAVAILABLE
        )
        return Response(payload, status=http_status)


class PrometheusMetricsView(APIView):
    """Expose les métriques au format Prometheus."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    @extend_schema(
        summary="Métriques Prometheus",
        description="Expose les métriques de l'application au format Prometheus",
        responses={
            200: OpenApiResponse(
                description="Métriques au format Prometheus",
                response={"type": "string"},
            ),
            401: OpenApiResponse(description="Token invalide"),
            404: OpenApiResponse(description="Prometheus désactivé"),
        },
        tags=["Monitoring"],
    )
    def get(self, request):
        if not getattr(settings, "PROMETHEUS_ENABLED", False):
            return Response(
                {"detail": "Prometheus désactivé. Définissez PROMETHEUS_ENABLED=1."},
                status=status.HTTP_404_NOT_FOUND,
            )

        token = getattr(settings, "PROMETHEUS_METRICS_TOKEN", "") or ""
        if token:
            auth = request.headers.get("Authorization", "")
            if auth != f"Bearer {token}":
                return Response(status=status.HTTP_401_UNAUTHORIZED)

        return HttpResponse(
            metrics_payload(),
            content_type=metrics_content_type(),
        )


class SentryDebugView(APIView):
    """Envoie une exception de test vers Sentry (admin uniquement)."""

    permission_classes = [IsAdminUser]
    serializer_class = None  # Pas de serializer pour cette vue de test

    @extend_schema(
        summary="Test Sentry",
        description="Envoie une exception de test à Sentry pour vérifier la configuration",
        responses={
            200: OpenApiResponse(
                description="Exception envoyée à Sentry",
                response={
                    "type": "object",
                    "properties": {"detail": {"type": "string"}},
                },
            ),
            400: OpenApiResponse(description="Sentry non configuré"),
        },
        tags=["Monitoring"],
    )
    def post(self, request):
        if not getattr(settings, "SENTRY_DSN", ""):
            return Response(
                {"detail": "SENTRY_DSN non configuré."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        import sentry_sdk

        try:
            _ = 1 / 0
        except ZeroDivisionError as exc:
            sentry_sdk.capture_exception(exc)

        return Response(
            {
                "detail": "Exception de test envoyée à Sentry. Vérifiez votre tableau de bord.",
            }
        )
