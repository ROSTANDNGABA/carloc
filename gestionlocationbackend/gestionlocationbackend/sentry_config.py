"""Initialisation Sentry (activée uniquement si SENTRY_DSN est défini)."""

import logging
import os

logger = logging.getLogger('carloc')


def init_sentry(*, debug: bool = False) -> bool:
    """
    Configure Sentry pour le suivi des erreurs et des performances.
    Retourne True si Sentry a été initialisé.
    """
    dsn = os.environ.get('SENTRY_DSN', '').strip()
    if not dsn:
        logger.debug('Sentry désactivé (SENTRY_DSN non défini).')
        return False

    import sentry_sdk
    from sentry_sdk.integrations.celery import CeleryIntegration
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration

    traces_sample_rate = float(os.environ.get('SENTRY_TRACES_SAMPLE_RATE', '0.1'))
    profiles_sample_rate = float(os.environ.get('SENTRY_PROFILES_SAMPLE_RATE', '0'))

    def env_bool(name: str, default: bool = False) -> bool:
        return os.environ.get(name, str(default)).lower() in ('1', 'true', 'yes', 'on')

    environment = os.environ.get(
        'SENTRY_ENVIRONMENT',
        'development' if debug else 'production',
    )

    sentry_sdk.init(
        dsn=dsn,
        integrations=[
            DjangoIntegration(),
            CeleryIntegration(),
            LoggingIntegration(level=logging.ERROR, event_level=logging.ERROR),
        ],
        traces_sample_rate=traces_sample_rate,
        profiles_sample_rate=profiles_sample_rate,
        send_default_pii=env_bool('SENTRY_SEND_PII', False),
        environment=environment,
        release=os.environ.get('SENTRY_RELEASE', 'carloc@1.0.0'),
        attach_stacktrace=True,
    )
    logger.info('Sentry initialisé (environnement=%s)', environment)
    return True
