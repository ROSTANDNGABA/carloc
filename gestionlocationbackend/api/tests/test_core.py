from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from rest_framework import status

from api.models import Contrat, Facture, NotificationLog, Paiement, Reservation
from api.services import (
    calculer_penalites_retard,
    creer_contrat_pour_reservation,
    creer_facture,
)

from .base import CarLocTestCase


class CoreMetierTests(CarLocTestCase):
    def test_inscription_client(self):
        response = self.client.post(
            "/api/clients/",
            {
                "nom": "Martin",
                "prenom": "Paul",
                "email": "paul@test.com",
                "telephone": "0701020304",
                "num_permis": "EF1234567",
                "password": "secret1234",
                "password_confirm": "secret1234",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="paul@test.com").exists())

    def test_inscription_mot_de_passe_trop_court(self):
        response = self.client.post(
            "/api/clients/",
            {
                "nom": "Court",
                "prenom": "Pwd",
                "email": "court@test.com",
                "telephone": "0701020305",
                "num_permis": "GH1234567",
                "password": "abc12",
                "password_confirm": "abc12",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_inscription_email_deja_utilise_message_clair(self):
        response = self.client.post(
            "/api/clients/",
            {
                "nom": "Dupont",
                "prenom": "Autre",
                "email": " CLIENT@test.com ",
                "telephone": "0701020306",
                "num_permis": "IJ1234567",
                "password": "secret1234",
                "password_confirm": "secret1234",
            },
            format="json",
            HTTP_HOST="127.0.0.1",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data.get("details", response.data))

    def test_inscription_numero_permis_deja_utilise_message_clair(self):
        response = self.client.post(
            "/api/clients/",
            {
                "nom": "Permis",
                "prenom": "Double",
                "email": "permis-double@test.com",
                "telephone": "0701020307",
                "num_permis": " ab1234567 ",
                "password": "secret1234",
                "password_confirm": "secret1234",
            },
            format="json",
            HTTP_HOST="127.0.0.1",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("num_permis", response.data.get("details", response.data))

    def test_client_modifie_son_profil_et_user_est_synchronise(self):
        self.client.force_authenticate(user=self.client_user)
        response = self.client.patch(
            f"/api/clients/{self.client_profile.id}/",
            {
                "nom": "Nouveau",
                "prenom": "Profil",
                "email": "nouveau-profil@test.com",
                "telephone": "0699887766",
                "num_permis": "KL1234567",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.client_profile.refresh_from_db()
        self.client_user.refresh_from_db()
        self.assertEqual(self.client_profile.email, "nouveau-profil@test.com")
        self.assertEqual(self.client_user.username, "nouveau-profil@test.com")
        self.assertEqual(self.client_user.first_name, "Profil")
        self.assertEqual(self.client_user.last_name, "Nouveau")

    def test_reservation_cree_contrat_facture_et_notification(self):
        self.client.force_authenticate(user=self.client_user)
        debut = date.today() + timedelta(days=5)
        fin = debut + timedelta(days=4)

        response = self.client.post(
            "/api/reservations/",
            {
                "client": self.client_profile.id,
                "vehicule": self.vehicule.id,
                "date_debut": debut.isoformat(),
                "date_fin": fin.isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        reservation = Reservation.objects.get(pk=response.data["id"])
        self.assertEqual(reservation.nb_jours, 4)
        self.assertTrue(Contrat.objects.filter(reservation=reservation).exists())
        self.assertTrue(
            Facture.objects.filter(
                reservation=reservation, type_facture="location"
            ).exists()
        )
        self.assertTrue(Contrat.objects.get(reservation=reservation).fichier_pdf)
        self.assertTrue(
            NotificationLog.objects.filter(reservation=reservation).exists()
        )

    def test_reservation_chevauchement_refuse(self):
        debut = date.today() + timedelta(days=10)
        fin = debut + timedelta(days=5)
        Reservation.objects.create(
            client=self.client_profile,
            vehicule=self.vehicule,
            date_debut=debut,
            date_fin=fin,
        )

        self.client.force_authenticate(user=self.client_user)
        response = self.client.post(
            "/api/reservations/",
            {
                "client": self.client_profile.id,
                "vehicule": self.vehicule.id,
                "date_debut": (debut + timedelta(days=1)).isoformat(),
                "date_fin": (fin + timedelta(days=1)).isoformat(),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_annulation_reservation(self):
        resa = Reservation.objects.create(
            client=self.client_profile,
            vehicule=self.vehicule,
            date_debut=date.today() + timedelta(days=20),
            date_fin=date.today() + timedelta(days=25),
        )
        creer_contrat_pour_reservation(resa)

        self.client.force_authenticate(user=self.client_user)
        response = self.client.post(f"/api/reservations/{resa.id}/annuler/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        resa.refresh_from_db()
        self.assertTrue(resa.est_annulee)

    def test_disponibilite_vehicule(self):
        debut = date.today() + timedelta(days=30)
        fin = debut + timedelta(days=3)
        response = self.client.get(
            f"/api/vehicules/{self.vehicule.id}/disponibilite/",
            {"date_debut": debut.isoformat(), "date_fin": fin.isoformat()},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["disponible"])

    def test_paiement_valide_et_acompte(self):
        debut = date.today()
        fin = debut + timedelta(days=3)
        reservation = Reservation.objects.create(
            client=self.client_profile,
            vehicule=self.vehicule,
            date_debut=debut,
            date_fin=fin,
        )
        creer_contrat_pour_reservation(reservation)

        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            "/api/paiements/",
            {
                "reservation": reservation.id,
                "montant_paye": "50000",
                "mode_paiement": "carte",
                "est_acompte": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Facture.objects.filter(
                reservation=reservation, type_facture="acompte"
            ).exists()
        )

    def test_paiement_depasse_solde_refuse(self):
        debut = date.today()
        fin = debut + timedelta(days=2)
        reservation = Reservation.objects.create(
            client=self.client_profile,
            vehicule=self.vehicule,
            date_debut=debut,
            date_fin=fin,
        )
        creer_contrat_pour_reservation(reservation)

        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            "/api/paiements/",
            {
                "reservation": reservation.id,
                "montant_paye": "999999",
                "mode_paiement": "carte",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_penalites_retard(self):
        reservation = Reservation.objects.create(
            client=self.client_profile,
            vehicule=self.vehicule,
            date_debut=date.today() - timedelta(days=10),
            date_fin=date.today() - timedelta(days=5),
        )
        penalites = calculer_penalites_retard(reservation, date.today())
        self.assertEqual(
            penalites, Decimal("5") * self.vehicule.prix_journalier * Decimal("1.5")
        )

    def test_cloture_contrat(self):
        reservation = Reservation.objects.create(
            client=self.client_profile,
            vehicule=self.vehicule,
            date_debut=date.today() - timedelta(days=5),
            date_fin=date.today() - timedelta(days=1),
        )
        contrat = creer_contrat_pour_reservation(reservation)

        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f"/api/contrats/{contrat.id}/cloturer/",
            {"kilometrage_retour": 15000},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        contrat.refresh_from_db()
        self.assertEqual(contrat.kilometrage_retour, 15000)

    def test_factures_accessibles_client(self):
        debut = date.today() + timedelta(days=1)
        fin = debut + timedelta(days=3)
        resa = Reservation.objects.create(
            client=self.client_profile,
            vehicule=self.vehicule,
            date_debut=debut,
            date_fin=fin,
        )
        creer_contrat_pour_reservation(resa)
        creer_facture(resa)

        self.client.force_authenticate(user=self.client_user)
        response = self.client.get("/api/factures/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertGreaterEqual(len(results), 1)

    def test_facture_pdf_manquant_est_regenere(self):
        debut = date.today() + timedelta(days=1)
        fin = debut + timedelta(days=3)
        resa = Reservation.objects.create(
            client=self.client_profile,
            vehicule=self.vehicule,
            date_debut=debut,
            date_fin=fin,
        )
        facture = creer_facture(resa)
        pdf_name = facture.fichier_pdf.name
        facture.fichier_pdf.storage.delete(pdf_name)

        self.client.force_authenticate(user=self.client_user)
        response = self.client.get(f"/api/factures/{facture.id}/telecharger-pdf/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("application/pdf", response["Content-Type"])
        facture.refresh_from_db()
        self.assertTrue(facture.fichier_pdf.storage.exists(facture.fichier_pdf.name))
