"""Tests des tâches critiques #1 à #4 (audit, logging, uploads, annulation)."""

import json
import logging
from datetime import timedelta
from decimal import Decimal
from io import BytesIO

from django.contrib.contenttypes.models import ContentType
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from rest_framework import status

from api.logging_config import CustomJsonFormatter
from api.models import AuditLog, Paiement, Reservation
from api.services import (
    ReservationCancellationError,
    annuler_reservation_avec_regles,
    calculer_remboursement_annulation,
    peut_annuler_reservation,
)
from api.validators import validate_document_file

from .base import CarLocTestCase


class AuditLogTests(CarLocTestCase):
    def test_reservation_create_writes_audit_log(self):
        reservation = Reservation.objects.create(
            client=self.client_profile,
            vehicule=self.vehicule,
            date_debut=timezone.now().date() + timedelta(days=5),
            date_fin=timezone.now().date() + timedelta(days=8),
        )
        ct = ContentType.objects.get_for_model(Reservation)
        logs = AuditLog.objects.filter(content_type=ct, object_id=reservation.id, action='create')
        self.assertTrue(logs.exists())
        self.assertIn('client_id', logs.first().new_values)


class LoggingTests(CarLocTestCase):
    def test_json_formatter_outputs_parseable_json(self):
        record = logging.LogRecord(
            name='carloc',
            level=logging.INFO,
            pathname=__file__,
            lineno=1,
            msg='Test log',
            args=(),
            exc_info=None,
        )
        record.reservation_id = 42
        output = CustomJsonFormatter().format(record)
        data = json.loads(output)
        self.assertEqual(data['level'], 'INFO')
        self.assertEqual(data['message'], 'Test log')
        self.assertEqual(data['reservation_id'], 42)


class UploadValidatorTests(CarLocTestCase):
    def test_rejects_executable_extension(self):
        bad = SimpleUploadedFile('virus.exe', b'fake', content_type='application/octet-stream')
        with self.assertRaises(Exception):
            validate_document_file(bad)

    def test_client_serializer_rejects_oversized_file(self):
        big_content = b'0' * (11 * 1024 * 1024)
        upload = SimpleUploadedFile('permis.pdf', big_content, content_type='application/pdf')
        payload = {
            'nom': 'Martin',
            'prenom': 'Paul',
            'email': 'paul@test.com',
            'telephone': '0611223344',
            'num_permis': 'CD7654321',
            'password': 'secret123',
            'password_confirm': 'secret123',
            'permis_conduire': upload,
        }
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/clients/', payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class CancellationRulesTests(CarLocTestCase):
    def _future_reservation(self, days_ahead=5):
        start = timezone.now().date() + timedelta(days=days_ahead)
        end = start + timedelta(days=3)
        return Reservation.objects.create(
            client=self.client_profile,
            vehicule=self.vehicule,
            date_debut=start,
            date_fin=end,
        )

    def test_refund_100_percent_when_more_than_48h(self):
        reservation = self._future_reservation(days_ahead=5)
        Paiement.objects.create(
            reservation=reservation,
            montant_paye=Decimal('100000'),
            mode_paiement='carte',
        )
        reservation.update_total_paye_cache()
        rembourse, penalite, raison = calculer_remboursement_annulation(reservation)
        self.assertEqual(rembourse, Decimal('100000'))
        self.assertEqual(penalite, Decimal('0'))
        self.assertIn('>48h', raison)

    def test_blocks_cancellation_when_location_in_progress(self):
        today = timezone.now().date()
        reservation = Reservation.objects.create(
            client=self.client_profile,
            vehicule=self.vehicule,
            date_debut=today,
            date_fin=today + timedelta(days=3),
        )
        with self.assertRaises(ReservationCancellationError):
            peut_annuler_reservation(reservation, user=self.client_user)

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
    def test_annuler_endpoint_returns_refund_details(self):
        reservation = self._future_reservation(days_ahead=5)
        Paiement.objects.create(
            reservation=reservation,
            montant_paye=Decimal('50000'),
            mode_paiement='carte',
        )
        self.client.force_authenticate(user=self.admin)
        url = f'/api/reservations/{reservation.id}/annuler/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('montant_rembourse', response.data)
        reservation.refresh_from_db()
        self.assertTrue(reservation.est_annulee)

        ct = ContentType.objects.get_for_model(Reservation)
        cancel_logs = AuditLog.objects.filter(
            content_type=ct, object_id=reservation.id, action='cancel'
        )
        self.assertTrue(cancel_logs.exists())

    def test_annuler_reservation_avec_regles_persists_cancel_audit(self):
        reservation = self._future_reservation(days_ahead=6)
        result = annuler_reservation_avec_regles(reservation, user=self.admin)
        self.assertIn('montant_remboursé', result)
        reservation.refresh_from_db()
        self.assertTrue(reservation.est_annulee)
