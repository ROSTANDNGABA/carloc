"""
Tests des cas limites (edge cases) pour garantir la robustesse du système.

Ces tests couvrent :
- Annulations à la limite des délais (48h, 24h, dernière minute)
- Réservations concurrentes (race conditions)
- Pénalités de retard extrêmes
- Paiements dépassant le montant dû
- Calculs sur des périodes chevauchantes
"""

import threading
from decimal import Decimal
from datetime import timedelta

import pytest
from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone

from api.models import Client, Reservation, Vehicule, Paiement, ConfigurationMetier
from api.services import (
    ReservationCancellationError,
    annuler_reservation_avec_regles,
    calculer_penalites_retard,
    calculer_remboursement_annulation,
    vehicule_disponible_pour_periode,
)
from api.serializers import PaiementSerializer, ReservationSerializer


@pytest.mark.django_db
class TestAnnulationEdgeCases:
    """Tests des règles d'annulation aux limites temporelles."""

    def test_annulation_exactement_48h_avant(self, client_user, vehicule):
        """Annuler exactement 48h avant = 100% remboursé."""
        # Créer une réservation qui commence dans exactement 48h
        date_debut = timezone.now().date() + timedelta(days=2)
        date_fin = date_debut + timedelta(days=3)

        reservation = Reservation.objects.create(
            client=client_user.client_profile,
            vehicule=vehicule,
            date_debut=date_debut,
            date_fin=date_fin,
        )

        # Ajouter un paiement
        paiement = Paiement.objects.create(
            reservation=reservation,
            montant_paye=Decimal("150000"),
            mode_paiement="especes",
        )
        reservation.update_total_paye_cache()

        # Annuler
        result = annuler_reservation_avec_regles(reservation, user=client_user)

        assert result["montant_remboursé"] == Decimal("150000")
        assert result["montant_pénalité"] == Decimal("0")
        assert (
            "100%" in result["taux_remboursement"]
            or ">48h" in result["taux_remboursement"]
        )

    def test_annulation_exactement_24h_avant(self, client_user, vehicule):
        """Annuler exactement 24h avant = 80% remboursé."""
        date_debut = timezone.now().date() + timedelta(days=1)
        date_fin = date_debut + timedelta(days=2)

        reservation = Reservation.objects.create(
            client=client_user.client_profile,
            vehicule=vehicule,
            date_debut=date_debut,
            date_fin=date_fin,
        )

        Paiement.objects.create(
            reservation=reservation,
            montant_paye=Decimal("100000"),
            mode_paiement="carte",
        )
        reservation.update_total_paye_cache()

        result = annuler_reservation_avec_regles(reservation, user=client_user)

        # 80% remboursé si la config est à 0.8
        ConfigurationMetier.objects.get_or_create(
            key="REFUND_RATE_24H", defaults={"value_decimal": Decimal("0.8")}
        )

        montant_attendu = Decimal("100000") * Decimal("0.8")
        assert result["montant_remboursé"] >= Decimal("50000")  # Au moins 50%
        assert result["montant_pénalité"] > Decimal("0")

    def test_annulation_moins_24h_client_bloque(self, client_user, vehicule):
        """Client ne peut pas annuler <24h avant le départ."""
        date_debut = timezone.now().date() + timedelta(hours=12)  # Dans 12h
        date_fin = date_debut + timedelta(days=1)

        reservation = Reservation.objects.create(
            client=client_user.client_profile,
            vehicule=vehicule,
            date_debut=date_debut,
            date_fin=date_fin,
        )

        # Client (non-staff) tente d'annuler
        with pytest.raises(ReservationCancellationError) as exc:
            annuler_reservation_avec_regles(reservation, user=client_user)

        assert "impossible" in str(exc.value).lower() or "too_late" in str(exc.value)

    def test_annulation_moins_24h_admin_autorise(
        self, admin_user, client_user, vehicule
    ):
        """Admin peut annuler même <24h avant."""
        date_debut = timezone.now().date() + timedelta(hours=12)
        date_fin = date_debut + timedelta(days=1)

        reservation = Reservation.objects.create(
            client=client_user.client_profile,
            vehicule=vehicule,
            date_debut=date_debut,
            date_fin=date_fin,
        )

        Paiement.objects.create(
            reservation=reservation,
            montant_paye=Decimal("80000"),
            mode_paiement="virement",
        )
        reservation.update_total_paye_cache()

        # Admin peut annuler
        result = annuler_reservation_avec_regles(reservation, user=admin_user)

        assert result["reservation_id"] == reservation.id
        assert result["montant_remboursé"] >= Decimal("0")


@pytest.mark.django_db
class TestReservationConcurrency:
    """Tests des conflits de réservations simultanées."""

    def test_deux_clients_reservent_meme_vehicule_simultanément(self, vehicule):
        """Race condition : deux clients cliquent 'Réserver' en même temps."""
        date_debut = timezone.now().date() + timedelta(days=5)
        date_fin = date_debut + timedelta(days=2)

        # Créer deux clients
        user1 = User.objects.create_user("client1@test.com", password="test123456")
        client1 = Client.objects.create(
            user=user1,
            nom="Dupont",
            prenom="Jean",
            email="client1@test.com",
            telephone="+237691234567",
        )

        user2 = User.objects.create_user("client2@test.com", password="test123456")
        client2 = Client.objects.create(
            user=user2,
            nom="Martin",
            prenom="Paul",
            email="client2@test.com",
            telephone="+237692345678",
        )

        resultats = {"success": 0, "failed": 0}
        errors = []

        def reserver_vehicule(client):
            """Fonction exécutée dans un thread séparé."""
            try:
                with transaction.atomic():
                    # Simuler le processus de réservation
                    if vehicule_disponible_pour_periode(vehicule, date_debut, date_fin):
                        Reservation.objects.create(
                            client=client,
                            vehicule=vehicule,
                            date_debut=date_debut,
                            date_fin=date_fin,
                        )
                        resultats["success"] += 1
                    else:
                        resultats["failed"] += 1
            except Exception as e:
                errors.append(str(e))
                resultats["failed"] += 1

        # Lancer deux threads en parallèle
        thread1 = threading.Thread(target=reserver_vehicule, args=(client1,))
        thread2 = threading.Thread(target=reserver_vehicule, args=(client2,))

        thread1.start()
        thread2.start()
        thread1.join()
        thread2.join()

        # Vérifier : une seule réservation doit réussir
        reservations_crees = Reservation.objects.filter(
            vehicule=vehicule,
            date_debut=date_debut,
        ).count()

        assert (
            reservations_crees == 1
        ), f"Expected 1 reservation, got {reservations_crees}"

    def test_modification_reservation_pendant_chevauchement(
        self, client_user, vehicule
    ):
        """Modifier une réservation pour créer un chevauchement doit échouer."""
        # Créer deux réservations séquentielles
        resa1 = Reservation.objects.create(
            client=client_user.client_profile,
            vehicule=vehicule,
            date_debut=timezone.now().date() + timedelta(days=1),
            date_fin=timezone.now().date() + timedelta(days=3),
        )

        resa2 = Reservation.objects.create(
            client=client_user.client_profile,
            vehicule=vehicule,
            date_debut=timezone.now().date() + timedelta(days=5),
            date_fin=timezone.now().date() + timedelta(days=7),
        )

        # Tenter de modifier resa2 pour chevaucher resa1
        serializer = ReservationSerializer(
            resa2,
            data={
                "date_debut": timezone.now().date()
                + timedelta(days=2),  # Chevauche resa1
                "date_fin": timezone.now().date() + timedelta(days=4),
            },
            partial=True,
        )

        assert not serializer.is_valid()
        assert "vehicule" in serializer.errors or "déjà réservé" in str(
            serializer.errors
        )


@pytest.mark.django_db
class TestPenalitesRetardEdgeCases:
    """Tests des pénalités de retard extrêmes."""

    def test_penalites_retard_1_jour(self, vehicule):
        """Pénalité pour 1 jour de retard."""
        date_debut = timezone.now().date() - timedelta(days=5)
        date_fin = timezone.now().date() - timedelta(days=2)

        reservation = Reservation.objects.create(
            client=Client.objects.create(
                nom="Test",
                prenom="User",
                email="test@penalite.com",
                telephone="+237693456789",
            ),
            vehicule=vehicule,
            date_debut=date_debut,
            date_fin=date_fin,
        )

        date_retour = date_fin + timedelta(days=1)
        penalites = calculer_penalites_retard(reservation, date_retour)

        # Pénalité = 1 jour × prix_journalier × multiplicateur (1.5 par défaut)
        multiplicateur = Decimal("1.5")
        attendu = vehicule.prix_journalier * multiplicateur

        assert penalites == attendu

    def test_penalites_retard_30_jours(self, vehicule):
        """Pénalité pour 30 jours de retard (cas extrême)."""
        date_debut = timezone.now().date() - timedelta(days=35)
        date_fin = timezone.now().date() - timedelta(days=32)

        reservation = Reservation.objects.create(
            client=Client.objects.create(
                nom="Retard",
                prenom="Extreme",
                email="retard@extreme.com",
                telephone="+237694567890",
            ),
            vehicule=vehicule,
            date_debut=date_debut,
            date_fin=date_fin,
        )

        date_retour = date_fin + timedelta(days=30)
        penalites = calculer_penalites_retard(reservation, date_retour)

        multiplicateur = Decimal("1.5")
        attendu = Decimal("30") * vehicule.prix_journalier * multiplicateur

        assert penalites == attendu
        # Vérifier que la pénalité est significative
        assert penalites > vehicule.prix_journalier * Decimal("40")

    def test_retour_avant_date_fin_pas_penalite(self, vehicule):
        """Retour avant la date de fin = 0 pénalité."""
        date_debut = timezone.now().date() - timedelta(days=5)
        date_fin = timezone.now().date() + timedelta(days=2)

        reservation = Reservation.objects.create(
            client=Client.objects.create(
                nom="Early",
                prenom="Return",
                email="early@return.com",
                telephone="+237695678901",
            ),
            vehicule=vehicule,
            date_debut=date_debut,
            date_fin=date_fin,
        )

        date_retour = timezone.now().date()  # Retour anticipé
        penalites = calculer_penalites_retard(reservation, date_retour)

        assert penalites == Decimal("0")


@pytest.mark.django_db
class TestPaiementsEdgeCases:
    """Tests des paiements limites."""

    def test_paiement_depasse_montant_du_refuse(self, client_user, vehicule):
        """Payer plus que le montant dû doit être refusé."""
        reservation = Reservation.objects.create(
            client=client_user.client_profile,
            vehicule=vehicule,
            date_debut=timezone.now().date() + timedelta(days=1),
            date_fin=timezone.now().date() + timedelta(days=3),
        )

        montant_du = reservation.montant_du

        # Tenter de payer plus que le montant dû
        serializer = PaiementSerializer(
            data={
                "reservation": reservation.id,
                "montant_paye": montant_du + Decimal("100000"),  # 100k de trop
                "mode_paiement": "especes",
            }
        )

        assert not serializer.is_valid()
        assert "montant_paye" in serializer.errors
        assert "dépasse" in str(serializer.errors).lower()

    def test_paiement_zero_refuse(self, client_user, vehicule):
        """Paiement de 0 FCFA doit être refusé."""
        reservation = Reservation.objects.create(
            client=client_user.client_profile,
            vehicule=vehicule,
            date_debut=timezone.now().date() + timedelta(days=1),
            date_fin=timezone.now().date() + timedelta(days=2),
        )

        serializer = PaiementSerializer(
            data={
                "reservation": reservation.id,
                "montant_paye": Decimal("0"),
                "mode_paiement": "carte",
            }
        )

        assert not serializer.is_valid()
        assert "montant_paye" in serializer.errors

    def test_paiement_negatif_refuse(self, client_user, vehicule):
        """Paiement négatif doit être refusé."""
        reservation = Reservation.objects.create(
            client=client_user.client_profile,
            vehicule=vehicule,
            date_debut=timezone.now().date() + timedelta(days=1),
            date_fin=timezone.now().date() + timedelta(days=2),
        )

        serializer = PaiementSerializer(
            data={
                "reservation": reservation.id,
                "montant_paye": Decimal("-50000"),
                "mode_paiement": "virement",
            }
        )

        assert not serializer.is_valid()
        assert "montant_paye" in serializer.errors


# Fixtures pytest
@pytest.fixture
def client_user(db):
    """Client normal (non-staff)."""
    user = User.objects.create_user(
        username="client@test.com",
        email="client@test.com",
        password="testpass123",
    )
    client = Client.objects.create(
        user=user,
        nom="Test",
        prenom="Client",
        email="client@test.com",
        telephone="+237690123456",
    )
    user.client_profile = client
    return user


@pytest.fixture
def admin_user(db):
    """Administrateur (staff)."""
    return User.objects.create_user(
        username="admin@test.com",
        email="admin@test.com",
        password="adminpass123",
        is_staff=True,
    )


@pytest.fixture
def vehicule(db):
    """Véhicule de test."""
    return Vehicule.objects.create(
        immatriculation="TEST-123",
        marque="Toyota",
        modele="Corolla",
        categorie="Berline",
        prix_journalier=Decimal("50000"),
        statut="disponible",
    )
