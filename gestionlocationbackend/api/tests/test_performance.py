"""
Tests de performance - Benchmarks pour valider les optimisations
"""

import time
from decimal import Decimal

import pytest
from django.contrib.auth.models import User
from django.test import Client as TestClient
from django.urls import reverse

from api.models import Client, Vehicule, Reservation, Paiement


@pytest.mark.django_db
class TestPerformance:
    """Tests de performance pour valider les optimisations SQL"""

    @pytest.fixture
    def setup_data(self, db):
        """Créer données de test pour benchmark"""
        # Créer admin
        admin = User.objects.create_user(
            username="admin@test.com", password="test123", is_staff=True
        )

        # Créer 10 véhicules
        vehicules = []
        for i in range(10):
            v = Vehicule.objects.create(
                immatriculation=f"TEST-{i:03d}",
                marque="Toyota",
                modele=f"Modèle {i}",
                categorie="Berline",
                prix_journalier=Decimal("50000"),
                statut="disponible",
            )
            vehicules.append(v)

        # Créer 5 clients
        clients = []
        for i in range(5):
            c = Client.objects.create(
                nom=f"Client{i}",
                prenom=f"Test{i}",
                email=f"client{i}@test.com",
                telephone=f"+23769012345{i}",
            )
            clients.append(c)

        # Créer 20 réservations avec paiements
        from datetime import date, timedelta

        today = date.today()

        for i in range(20):
            resa = Reservation.objects.create(
                client=clients[i % 5],
                vehicule=vehicules[i % 10],
                date_debut=today + timedelta(days=i),
                date_fin=today + timedelta(days=i + 3),
            )
            # Ajouter paiements
            Paiement.objects.create(
                reservation=resa,
                montant_paye=Decimal("100000"),
                mode_paiement="especes",
            )
            resa.update_total_paye_cache()

        return admin

    def test_dashboard_performance(self, setup_data):
        """Dashboard doit répondre en moins de 1 seconde"""
        client = TestClient()
        client.force_login(setup_data)

        # Warmup (première requête peut être lente)
        client.get(reverse("dashboard"))

        # Mesure réelle
        start = time.time()
        response = client.get(reverse("dashboard"))
        duration = time.time() - start

        assert response.status_code == 200
        assert duration < 1.0, f"Dashboard trop lent: {duration:.2f}s (max 1s)"

        # Vérifier nombre de queries (doit être optimisé)
        from django.db import connection

        # Le nombre devrait être <50 queries
        num_queries = len(connection.queries)
        assert num_queries < 50, f"Trop de queries: {num_queries} (max 50)"

    def test_liste_vehicules_performance(self, setup_data):
        """Liste véhicules doit répondre rapidement"""
        client = TestClient()
        client.force_login(setup_data)

        start = time.time()
        response = client.get(reverse("vehicule-list"))
        duration = time.time() - start

        assert response.status_code == 200
        assert duration < 0.5, f"Liste véhicules trop lente: {duration:.2f}s"

    def test_liste_reservations_performance(self, setup_data):
        """Liste réservations doit répondre rapidement"""
        client = TestClient()
        client.force_login(setup_data)

        start = time.time()
        response = client.get(reverse("reservation-list"))
        duration = time.time() - start

        assert response.status_code == 200
        assert duration < 0.5, f"Liste réservations trop lente: {duration:.2f}s"

    def test_creation_reservation_performance(self, setup_data):
        """Création réservation doit être rapide (avec select_for_update)"""
        from datetime import date, timedelta

        client = TestClient()
        client.force_login(setup_data)

        vehicule = Vehicule.objects.first()
        client_obj = Client.objects.first()
        today = date.today()

        data = {
            "client": client_obj.id,
            "vehicule": vehicule.id,
            "date_debut": (today + timedelta(days=30)).isoformat(),
            "date_fin": (today + timedelta(days=33)).isoformat(),
        }

        start = time.time()
        response = client.post(reverse("reservation-list"), data=data)
        duration = time.time() - start

        assert response.status_code == 201
        assert duration < 1.0, f"Création réservation trop lente: {duration:.2f}s"


@pytest.mark.django_db
class TestScalability:
    """Tests de scalabilité avec plus de données"""

    def test_dashboard_avec_beaucoup_donnees(self, db):
        """Dashboard doit tenir la charge avec beaucoup de données"""
        # Créer admin
        admin = User.objects.create_user(
            username="admin@test.com", password="test123", is_staff=True
        )

        # Créer 50 véhicules
        vehicules = []
        for i in range(50):
            v = Vehicule.objects.create(
                immatriculation=f"LOAD-{i:04d}",
                marque="Marque",
                modele="Modèle",
                categorie="Berline",
                prix_journalier=Decimal("50000"),
            )
            vehicules.append(v)

        # Créer 100 réservations
        from datetime import date, timedelta

        today = date.today()

        for i in range(100):
            client_obj = Client.objects.create(
                nom=f"Load{i}",
                prenom="Test",
                email=f"load{i}@test.com",
                telephone=f"+237690{i:06d}",
            )
            Reservation.objects.create(
                client=client_obj,
                vehicule=vehicules[i % 50],
                date_debut=today + timedelta(days=i),
                date_fin=today + timedelta(days=i + 2),
            )

        # Tester dashboard
        client = TestClient()
        client.force_login(admin)

        start = time.time()
        response = client.get(reverse("dashboard"))
        duration = time.time() - start

        assert response.status_code == 200
        # Même avec 50 véhicules et 100 réservations, doit rester <2s
        assert (
            duration < 2.0
        ), f"Dashboard ne scale pas: {duration:.2f}s avec 100 réservations"
