"""Tests tâches #9–#12 : Celery, config métier, soft-delete."""

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import override_settings
from django.utils import timezone

from api.models import Client, ConfigurationMetier, Vehicule
from api.services import calculer_penalites_retard, calculer_remboursement_annulation
from api.tasks import sync_all_vehicle_status

from .base import CarLocTestCase


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class CeleryTasksTests(CarLocTestCase):
    def test_sync_all_vehicle_status_runs(self):
        result = sync_all_vehicle_status()
        self.assertEqual(result, 'ok')


class ConfigurationMetierTests(CarLocTestCase):
    def setUp(self):
        super().setUp()
        ConfigurationMetier.objects.update_or_create(
            key='PENALTY_MULTIPLICATEUR',
            defaults={
                'category': 'penalty',
                'value_decimal': Decimal('2.0'),
                'description': 'Test',
            },
        )

    def test_penalty_uses_config_value(self):
        today = timezone.now().date()
        from api.models import Reservation

        reservation = Reservation.objects.create(
            client=self.client_profile,
            vehicule=self.vehicule,
            date_debut=today - timedelta(days=5),
            date_fin=today - timedelta(days=2),
        )
        penalites = calculer_penalites_retard(reservation, today)
        jours_retard = (today - reservation.date_fin).days
        expected = Decimal(jours_retard) * self.vehicule.prix_journalier * Decimal('2')
        self.assertEqual(penalites, expected)

    def test_refund_rate_from_config(self):
        ConfigurationMetier.objects.update_or_create(
            key='REFUND_RATE_48H',
            defaults={'category': 'refund', 'value_decimal': Decimal('0.9'), 'description': 'Test'},
        )
        start = timezone.now().date() + timedelta(days=5)
        from api.models import Reservation

        reservation = Reservation.objects.create(
            client=self.client_profile,
            vehicule=self.vehicule,
            date_debut=start,
            date_fin=start + timedelta(days=2),
        )
        rembourse, _, _ = calculer_remboursement_annulation(reservation)
        self.assertEqual(rembourse, Decimal('0'))


class SoftDeleteTests(CarLocTestCase):
    def test_client_soft_delete_hides_from_default_manager(self):
        client_id = self.client_profile.id
        self.client_profile.delete()
        self.assertFalse(Client.objects.filter(pk=client_id).exists())
        self.assertTrue(Client.all_objects.filter(pk=client_id, is_active=False).exists())

    def test_vehicule_soft_delete(self):
        vehicule = Vehicule.objects.create(
            immatriculation='ZZ-999-ZZ',
            marque='Test',
            modele='Soft',
            categorie='Citadine',
            prix_journalier=Decimal('10000'),
        )
        vehicule_id = vehicule.id
        vehicule.delete()
        self.assertFalse(Vehicule.objects.filter(pk=vehicule_id).exists())
        deleted = Vehicule.all_objects.get(pk=vehicule_id)
        self.assertFalse(deleted.is_active)
        self.assertIsNotNone(deleted.deleted_at)
