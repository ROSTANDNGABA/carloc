"""Tests unitaires pytest — logique métier services.py."""

from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth.models import User
from django.utils import timezone

from api.models import Client, Paiement, Reservation, Vehicule
from api.services import (
    ReservationCancellationError,
    calculer_penalites_retard,
    calculer_remboursement_annulation,
    peut_annuler_reservation,
    vehicule_disponible_pour_periode,
)


@pytest.fixture
def vehicule(db):
    return Vehicule.objects.create(
        immatriculation='AA-123-BB',
        marque='Peugeot',
        modele='208',
        categorie='Citadine',
        prix_journalier=Decimal('45.00'),
        statut='disponible',
    )


@pytest.fixture
def client_user(db):
    return User.objects.create_user(
        username='test@example.com',
        email='test@example.com',
        password='testpass123',
    )


@pytest.fixture
def client_profile(db, client_user):
    return Client.objects.create(
        user=client_user,
        nom='Dupont',
        prenom='Jean',
        email='test@example.com',
        telephone='0612345678',
        num_permis='AB1234567',
    )


@pytest.fixture
def reservation(db, client_profile, vehicule):
    today = timezone.now().date()
    return Reservation.objects.create(
        client=client_profile,
        vehicule=vehicule,
        date_debut=today + timedelta(days=5),
        date_fin=today + timedelta(days=8),
    )


@pytest.mark.django_db
class TestPenalties:
    def test_no_penalty_if_on_time(self, reservation):
        result = calculer_penalites_retard(reservation, reservation.date_fin)
        assert result == Decimal('0')

    def test_penalty_3_days_late(self, reservation):
        result = calculer_penalites_retard(
            reservation,
            reservation.date_fin + timedelta(days=3),
        )
        assert result == Decimal('202.50')


@pytest.mark.django_db
class TestCancellation:
    def test_cannot_cancel_already_cancelled(self, reservation):
        reservation.est_annulee = True
        reservation.save(update_fields=['est_annulee'])

        with pytest.raises(ReservationCancellationError):
            peut_annuler_reservation(reservation)

    def test_cannot_cancel_in_progress(self, client_profile, vehicule):
        today = timezone.now().date()
        res = Reservation.objects.create(
            client=client_profile,
            vehicule=vehicule,
            date_debut=today,
            date_fin=today + timedelta(days=3),
        )
        with pytest.raises(ReservationCancellationError) as exc:
            peut_annuler_reservation(res, user=None)
        assert exc.value.code == 'reservation_in_progress'

    def test_refund_100_percent_if_more_than_48h(self, reservation):
        Paiement.objects.create(
            reservation=reservation,
            montant_paye=Decimal('100'),
            mode_paiement='carte',
        )
        reservation.update_total_paye_cache()
        refund, penalty, reason = calculer_remboursement_annulation(reservation)
        assert refund == Decimal('100')
        assert penalty == Decimal('0')
        assert '>48h' in reason

    def test_refund_80_percent_if_24_to_48h(self, client_profile, vehicule):
        tomorrow = timezone.now().date() + timedelta(days=1)
        res = Reservation.objects.create(
            client=client_profile,
            vehicule=vehicule,
            date_debut=tomorrow,
            date_fin=tomorrow + timedelta(days=2),
        )
        Paiement.objects.create(
            reservation=res,
            montant_paye=Decimal('100'),
            mode_paiement='carte',
        )
        res.update_total_paye_cache()
        refund, penalty, _ = calculer_remboursement_annulation(res)
        assert refund == Decimal('80')
        assert penalty == Decimal('20')


@pytest.mark.django_db
class TestAvailability:
    def test_vehicle_not_available_if_maintenance(self, vehicule):
        vehicule.statut = 'maintenance'
        vehicule.save(update_fields=['statut'])
        today = timezone.now().date()
        assert vehicule_disponible_pour_periode(
            vehicule, today + timedelta(days=1), today + timedelta(days=3)
        ) is False

    def test_vehicle_not_available_if_booked(self, reservation):
        assert vehicule_disponible_pour_periode(
            reservation.vehicule,
            reservation.date_debut,
            reservation.date_fin,
        ) is False

    def test_vehicle_available_if_no_conflict(self, vehicule):
        today = timezone.now().date()
        assert vehicule_disponible_pour_periode(
            vehicule, today + timedelta(days=10), today + timedelta(days=12)
        ) is True


@pytest.mark.django_db
class TestTotalPayeCache:
    def test_cache_updates_after_payment(self, reservation):
        assert reservation.total_paye_cache == Decimal('0')
        paiement = Paiement.objects.create(
            reservation=reservation,
            montant_paye=Decimal('150'),
            mode_paiement='carte',
        )
        reservation.update_total_paye_cache()
        reservation.refresh_from_db()
        assert reservation.total_paye_cache == Decimal('150')
        assert reservation.total_paye == Decimal('150')
        assert paiement.reservation_id == reservation.id
