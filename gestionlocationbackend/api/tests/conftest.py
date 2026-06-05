"""Configuration pytest partagee."""
import pytest


@pytest.fixture(autouse=True)
def disable_throttling(settings, request):
    """Evite les 429 sur la suite, sauf pour les tests du rate limiting."""
    if request.node.path.name == 'test_rate_limit.py':
        return

    settings.REST_FRAMEWORK = {
        **settings.REST_FRAMEWORK,
        'DEFAULT_THROTTLE_CLASSES': [],
    }
