"""Middleware pour propager utilisateur et IP vers les signaux d'audit."""

from .audit_context import reset_audit_context, set_audit_context


def _client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class AuditContextMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = (
            request.user
            if getattr(request, "user", None) and request.user.is_authenticated
            else None
        )
        token = set_audit_context(user=user, ip_address=_client_ip(request))
        try:
            return self.get_response(request)
        finally:
            reset_audit_context(token)
