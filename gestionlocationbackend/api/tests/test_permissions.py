from datetime import date, timedelta

from rest_framework import status

from api.models import Reservation
from api.services import creer_contrat_pour_reservation, creer_facture

from .base import CarLocTestCase


class PermissionsTests(CarLocTestCase):
    def test_historique_vehicule_admin_seulement(self):
        url = f'/api/vehicules/{self.vehicule.id}/historique/'

        self.client.force_authenticate(user=self.client_user)
        self.assertEqual(self.client.get(url).status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=None)
        self.assertIn(
            self.client.get(url).status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

        self.client.force_authenticate(user=self.admin)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('rentabilite', response.data['resume'])

    def test_historique_client_propre_profil(self):
        self.client.force_authenticate(user=self.client_user)
        response = self.client.get(f'/api/clients/{self.client_profile.id}/historique/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_historique_client_autre_refuse(self):
        from api.models import Client
        from django.contrib.auth.models import User

        autre_user = User.objects.create_user('autre@test.com', 'autre@test.com', 'password12345')
        autre = Client.objects.create(
            user=autre_user,
            nom='Autre',
            prenom='Client',
            email='autre@test.com',
            telephone='0611111111',
            num_permis='MN9876543',
        )

        self.client.force_authenticate(user=self.client_user)
        response = self.client.get(f'/api/clients/{autre.id}/historique/')
        # 404 car le client n'est pas dans le queryset ; 403 si accès refusé explicitement
        self.assertIn(response.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))

    def test_dashboard_admin_seulement(self):
        self.client.force_authenticate(user=self.client_user)
        self.assertEqual(self.client.get('/api/dashboard/').status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.admin)
        self.assertEqual(self.client.get('/api/dashboard/').status_code, status.HTTP_200_OK)

    def test_dashboard_avec_periode(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/dashboard/', {
            'date_debut': '2026-01-01',
            'date_fin': '2026-12-31',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('vehicules_plus_rentables', response.data)
        self.assertIn('chiffre_affaires_periode', response.data)

    def test_clients_statistiques_admin_seulement(self):
        self.client.force_authenticate(user=self.client_user)
        self.assertEqual(
            self.client.get('/api/clients/statistiques/').status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/clients/statistiques/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_clients', response.data)

    def test_notifications_admin_seulement(self):
        self.client.force_authenticate(user=self.client_user)
        self.assertEqual(self.client.get('/api/notifications/').status_code, status.HTTP_403_FORBIDDEN)

    def test_vehicule_creation_client_refuse(self):
        self.client.force_authenticate(user=self.client_user)
        response = self.client.post('/api/vehicules/', {
            'immatriculation': 'ZZ-999-ZZ',
            'marque': 'Test',
            'modele': 'X',
            'categorie': 'SUV',
            'prix_journalier': '30000',
            'statut': 'disponible',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_vehicule_creation_admin_ok(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/vehicules/', {
            'immatriculation': 'ZZ-888-ZZ',
            'marque': 'Peugeot',
            'modele': '3008',
            'categorie': 'SUV',
            'prix_journalier': '45000',
            'statut': 'disponible',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_paiements_client_refuse(self):
        resa = Reservation.objects.create(
            client=self.client_profile,
            vehicule=self.vehicule,
            date_debut=date.today() + timedelta(days=40),
            date_fin=date.today() + timedelta(days=45),
        )
        self.client.force_authenticate(user=self.client_user)
        response = self.client.post('/api/paiements/', {
            'reservation': resa.id,
            'montant_paye': '10000',
            'mode_paiement': 'especes',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
