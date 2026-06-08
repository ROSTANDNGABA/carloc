"""
Limitation de débit API (protection brute-force, abus, DDoS).

Configuration dans settings.py:
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_RATES': {
        'login': '5/5min',      # 5 tentatives par 5 minutes
        'login_hour': '20/hour', # 20 tentatives par heure max
        'user': '100/minute',    # Client authentifié
        'anon': '10/minute',     # Visiteur anonyme
    }
}
"""
import logging
from rest_framework.throttling import SimpleRateThrottle, UserRateThrottle, AnonRateThrottle

logger = logging.getLogger('carloc.security')


class LoginThrottle(SimpleRateThrottle):
    """
    5 tentatives de connexion par 5 minutes par IP.
    Protection contre le brute-force de mots de passe.
    """
    scope = 'login'

    def get_cache_key(self, request, view):
        # Ne pas limiter les utilisateurs déjà authentifiés
        if request.user and request.user.is_authenticated:
            return None
        
        # Utiliser l'IP comme identifiant
        ident = self.get_ident(request)
        
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident,
        }

    def throttle_failure(self):
        """Log les tentatives de connexion excessives."""
        logger.warning(
            "Rate limit exceeded on login",
            extra={
                'event': 'rate_limit_exceeded',
                'endpoint': 'login',
                'scope': self.scope,
            }
        )
        return super().throttle_failure()


class LoginHourlyThrottle(SimpleRateThrottle):
    """
    20 tentatives de connexion par heure par IP.
    Protection supplémentaire contre les attaques distribuées lentes.
    """
    scope = 'login_hour'

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


class StrictAnonRateThrottle(AnonRateThrottle):
    """
    10 requêtes par minute pour les visiteurs anonymes.
    Protège contre le scraping et les scans automatisés.
    """
    scope = 'anon'


class BurstRateThrottle(SimpleRateThrottle):
    """
    Protection contre les pics d'utilisation (burst).
    30 requêtes par seconde max pour éviter de saturer le serveur.
    """
    scope = 'burst'
    rate = '30/second'

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = f'user_{request.user.id}'
        else:
            ident = self.get_ident(request)
        
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident,
        }
