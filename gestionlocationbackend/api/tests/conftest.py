"""Configuration pytest partagée."""

import pytest
from django.conf import settings


@pytest.fixture(autouse=True)
def disable_throttling_for_tests(settings):
    """Évite les 429 sur la suite de tests API existante."""
    settings.REST_FRAMEWORK = {
        **settings.REST_FRAMEWORK,
        'DEFAULT_THROTTLE_CLASSES': [],
    }
    settings.CARLOC_DISABLE_LOGIN_THROTTLE = True
