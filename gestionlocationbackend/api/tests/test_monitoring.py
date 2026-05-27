"""Tests monitoring : santé, Prometheus, Sentry."""

from unittest.mock import MagicMock, patch

from django.test import override_settings
from rest_framework import status

from .base import CarLocTestCase


class HealthCheckTests(CarLocTestCase):
    def test_health_returns_ok(self):
        response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'ok')
        self.assertEqual(response.data['database'], 'ok')


@override_settings(PROMETHEUS_ENABLED=True, PROMETHEUS_METRICS_TOKEN='')
class PrometheusTests(CarLocTestCase):
    def test_metrics_endpoint_returns_prometheus_format(self):
        self.client.get('/api/health/')
        response = self.client.get('/metrics')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.content.decode()
        self.assertIn('carloc_http_requests_total', body)
        self.assertIn('carloc_http_request_duration_seconds', body)

    def test_metrics_requires_token_when_configured(self):
        with self.settings(PROMETHEUS_METRICS_TOKEN='secret-token'):
            response = self.client.get('/metrics')
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

            response = self.client.get(
                '/metrics',
                HTTP_AUTHORIZATION='Bearer secret-token',
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)

    @override_settings(PROMETHEUS_ENABLED=False)
    def test_metrics_disabled_returns_404(self):
        response = self.client.get('/metrics')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class SentryTests(CarLocTestCase):
    @patch('sentry_sdk.capture_exception')
    def test_sentry_debug_sends_exception_when_dsn_set(self, mock_capture):
        with self.settings(SENTRY_DSN='https://example@sentry.io/1'):
            self.client.force_authenticate(user=self.admin)
            response = self.client.post('/api/monitoring/sentry-test/')
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            mock_capture.assert_called_once()

    def test_sentry_debug_without_dsn_returns_400(self):
        with self.settings(SENTRY_DSN=''):
            self.client.force_authenticate(user=self.admin)
            response = self.client.post('/api/monitoring/sentry-test/')
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('sentry_sdk.init')
    def test_sentry_init_skipped_without_dsn(self, mock_init):
        import os

        with patch.dict(os.environ, {'SENTRY_DSN': ''}, clear=False):
            from gestionlocationbackend.sentry_config import init_sentry

            result = init_sentry(debug=True)
            self.assertFalse(result)
            mock_init.assert_not_called()

    @patch('sentry_sdk.init')
    def test_sentry_init_when_dsn_present(self, mock_init):
        import os

        with patch.dict(os.environ, {'SENTRY_DSN': 'https://key@sentry.io/123'}, clear=False):
            from gestionlocationbackend.sentry_config import init_sentry

            result = init_sentry(debug=False)
            self.assertTrue(result)
            mock_init.assert_called_once()
