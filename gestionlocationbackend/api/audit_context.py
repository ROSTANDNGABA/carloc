"""Contexte requête pour enrichir les logs d'audit (acteur, IP)."""

from contextvars import ContextVar

_audit_context: ContextVar[dict] = ContextVar("audit_context", default={})


def set_audit_context(user=None, ip_address=None):
    return _audit_context.set({"user": user, "ip_address": ip_address})


def reset_audit_context(token):
    _audit_context.reset(token)


def get_audit_context():
    return _audit_context.get()
