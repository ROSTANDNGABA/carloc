"""Tests du rate limiting sur /api/auth/login/."""

from django.contrib.auth.models import User
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from .base import REST_FRAMEWORK_NO_THROTTLE


@override_settings(
    REST_FRAMEWORK=REST_FRAMEWORK_NO_THROTTLE,
    CARLOC_DISABLE_LOGIN_THROTTLE=False,
)
class LoginRateLimitTests(APITestCase):
    """Throttle activé uniquement sur la vue login."""

    def setUp(self):
        User.objects.create_user(
            username='throttle@test.com',
            email='throttle@test.com',
            password='goodpass123',
        )
        self.client = APIClient()

    def test_sixth_login_attempt_returns_429(self):
        payload = {'username': 'wrong', 'password': 'wrong'}
        for _ in range(5):
            response = self.client.post('/api/auth/login/', payload, format='json')
            self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_400_BAD_REQUEST))

        response = self.client.post('/api/auth/login/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
