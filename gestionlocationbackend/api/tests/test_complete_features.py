"""Tests des 8 points de complétion : erreurs API, réservation, suppression, cache."""

from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status

from api.exceptions import DeletionNotAllowedError, ReservationNotAllowedError
from api.models import ConfigurationMetier, Reservation
from api.reporting import get_dashboard_complet, invalidate_dashboard_cache
from api.reservation_rules import valider_eligibilite_reservation

from .base import CarLocTestCase


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    DASHBOARD_CACHE_ENABLED=True,
    CARLOC_FILE_ENCRYPTION_KEY='1p4BFVkugW33nYov86Ej4qF3aPOWhaacQpzfEVFmujk=',
    CACHES={
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'carloc-test-complete',
        }
    },
)
class CompleteFeaturesTests(CarLocTestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        ConfigurationMetier.objects.update_or_create(
            key='MAX_ACTIVE_RESERVATIONS_PER_CLIENT',
            defaults={
                'category': 'reservation',
                'value_int': 5,
                'description': 'Limite réservations actives',
            },
        )

    def test_api_error_format_on_not_found(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/clients/999999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('code', response.data)
        self.assertIn('message', response.data)
        self.assertIn('details', response.data)

    def test_reservation_date_in_past_returns_structured_error(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/reservations/', {
            'client': self.client_profile.id,
            'vehicule': self.vehicule.id,
            'date_debut': (date.today() - timedelta(days=2)).isoformat(),
            'date_fin': (date.today() + timedelta(days=2)).isoformat(),
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get('code'), 'date_in_past')

    def test_cannot_delete_client_with_active_reservation(self):
        debut = date.today() + timedelta(days=1)
        fin = debut + timedelta(days=3)
        Reservation.objects.create(
            client=self.client_profile,
            vehicule=self.vehicule,
            date_debut=debut,
            date_fin=fin,
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f'/api/clients/{self.client_profile.id}/')
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data.get('code'), 'client_has_active_reservations')

    def test_cannot_delete_vehicle_with_active_reservation(self):
        debut = date.today() + timedelta(days=1)
        fin = debut + timedelta(days=3)
        Reservation.objects.create(
            client=self.client_profile,
            vehicule=self.vehicule,
            date_debut=debut,
            date_fin=fin,
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f'/api/vehicules/{self.vehicule.id}/')
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data.get('code'), 'vehicule_has_active_reservations')

    def test_dashboard_cache_is_used(self):
        self.client.force_authenticate(user=self.admin)
        with patch('api.reporting._compute_dashboard_complet') as compute:
            compute.return_value = {'cached': True, 'total_clients': 1}
            first = get_dashboard_complet()
            second = get_dashboard_complet()
            self.assertEqual(first, second)
            compute.assert_called_once()

        invalidate_dashboard_cache()
        with patch('api.reporting._compute_dashboard_complet') as compute:
            compute.return_value = {'cached': False}
            get_dashboard_complet()
            compute.assert_called_once()

    def test_pagination_and_search_clients(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/clients/', {'page': 1, 'search': 'Dupont'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)

    def test_reservation_rules_require_documents_when_enabled(self):
        ConfigurationMetier.objects.filter(key='REQUIRE_CLIENT_DOCUMENTS').update(value_bool=True)
        debut = date.today() + timedelta(days=5)
        fin = debut + timedelta(days=3)
        with self.assertRaises(ReservationNotAllowedError) as ctx:
            valider_eligibilite_reservation(self.client_profile, debut, fin)
        self.assertEqual(ctx.exception.code, 'missing_permis_document')

    def test_deletion_rules_unit(self):
        debut = date.today()
        fin = debut + timedelta(days=2)
        Reservation.objects.create(
            client=self.client_profile,
            vehicule=self.vehicule,
            date_debut=debut,
            date_fin=fin,
        )
        from api.deletion_rules import valider_suppression_client

        with self.assertRaises(DeletionNotAllowedError):
            valider_suppression_client(self.client_profile)

    def test_encrypted_storage_roundtrip(self):
        from api.storages import EncryptedMediaStorage

        storage = EncryptedMediaStorage()
        content = SimpleUploadedFile('permis.pdf', b'pdf-content', content_type='application/pdf')
        name = storage.save('test/permis.pdf', content)
        with storage.open(name) as opened:
            self.assertEqual(opened.read(), b'pdf-content')
        storage.delete(name)
