"""Limitation de débit API (brute-force login, abus)."""

from rest_framework.throttling import SimpleRateThrottle, UserRateThrottle


class LoginThrottle(SimpleRateThrottle):
    """5 tentatives de connexion par 5 minutes et par IP."""

    scope = 'login'

    def __init__(self):
        self.rate = '5/300s'
        self.num_requests = 5
        self.duration = 300

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            return None
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request),
        }


class ClientThrottle(UserRateThrottle):
    """100 requêtes par minute pour un utilisateur authentifié."""

    scope = 'user'
