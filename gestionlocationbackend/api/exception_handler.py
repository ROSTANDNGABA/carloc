"""Handler DRF global — réponses d'erreur JSON uniformes."""

import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.views import exception_handler as drf_exception_handler

from .exceptions import CarLocAPIException

logger = logging.getLogger("carloc")


def _normalize_details(data):
    if data is None:
        return {}
    if isinstance(data, dict):
        return data
    if isinstance(data, list):
        return {"errors": data}
    return {"detail": str(data)}


def carloc_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)

    if isinstance(exc, CarLocAPIException):
        return _build_response(
            exc.status_code,
            exc.code,
            str(exc.detail),
            getattr(exc, "details", None) or {},
        )

    if isinstance(exc, DjangoValidationError):
        return _build_response(
            status.HTTP_400_BAD_REQUEST,
            "validation_error",
            "Données invalides.",
            _normalize_details(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            ),
        )

    if response is not None:
        code = getattr(exc, "default_code", "api_error")
        if isinstance(exc, APIException):
            code = getattr(exc, "default_code", code)

        details = _normalize_details(response.data)
        message = (
            details.get("detail")
            or details.get("non_field_errors")
            or "Requête invalide."
        )
        if isinstance(message, list):
            message = message[0] if message else "Requête invalide."

        response.data = {
            "code": code,
            "message": str(message),
            "details": details,
        }
        return response

    logger.exception("Erreur non gérée", exc_info=exc)
    return _build_response(
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "internal_error",
        "Erreur interne du serveur.",
        {},
    )


def _build_response(http_status, code, message, details):
    from rest_framework.response import Response

    return Response(
        {"code": code, "message": message, "details": details},
        status=http_status,
    )
