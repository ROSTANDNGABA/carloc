from django.contrib.auth.models import User
from rest_framework import status

from api.models import Client

from .base import CarLocTestCase


class AuthTests(CarLocTestCase):
    def test_login_retourne_jwt_et_client_id(self):
        response = self.client.post(
            "/api/auth/login/",
            {
                "username": "client@test.com",
                "password": "client12345",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["role"], "client")
        self.assertEqual(response.data["client_id"], self.client_profile.id)

    def test_login_admin_role(self):
        # Create a true admin (superuser) to get the 'admin' role
        admin_user = User.objects.create_superuser(
            "superadmin@test.com", "superadmin@test.com", "admin12345"
        )
        response = self.client.post(
            "/api/auth/login/",
            {
                "username": "superadmin@test.com",
                "password": "admin12345",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], "admin")
        self.assertIsNone(response.data.get("client_id"))

    def test_login_gestionnaire_role(self):
        # The base test admin is staff but not superuser, so role is 'gestionnaire'
        response = self.client.post(
            "/api/auth/login/",
            {
                "username": "admin@test.com",
                "password": "admin12345",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], "gestionnaire")
        self.assertIsNone(response.data.get("client_id"))

    def test_login_client_par_prenom_si_unique(self):
        user = User.objects.create_user(
            username="lois@test.com",
            email="lois@test.com",
            password="secretLois123",
        )
        Client.objects.create(
            user=user,
            nom="Lane",
            prenom="Lois",
            email="lois@test.com",
            telephone="0611111111",
            num_permis="CD7654321",
        )
        response = self.client.post(
            "/api/auth/login/",
            {
                "username": "lois",
                "password": "secretLois123",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], "client")
        self.assertEqual(response.data["user"]["email"], "lois@test.com")

    def test_clients_me_authentifie(self):
        self.client.force_authenticate(user=self.client_user)
        response = self.client.get("/api/clients/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "client@test.com")


class SwaggerTests(CarLocTestCase):
    def test_schema_openapi_accessible(self):
        response = self.client.get("/api/schema/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("openapi", response.data)
        self.assertEqual(response.data["info"]["title"], "CarLoc API")

    def test_swagger_ui_accessible(self):
        response = self.client.get("/api/docs/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertContains(response, "swagger", status_code=200)

    def test_redoc_accessible(self):
        response = self.client.get("/api/redoc/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_schema_contient_endpoints_cles(self):
        schema = self.client.get("/api/schema/").data
        paths = schema.get("paths", {})
        checks = (
            ("vehicules", "/api/vehicules/"),
            ("reservations", "/api/reservations/"),
            ("login", "/api/auth/login/"),
            ("dashboard", "/api/dashboard/"),
            ("factures", "/api/factures/"),
        )
        paths_str = " ".join(paths.keys())
        for name, fragment in checks:
            found = fragment in paths_str or f"/{name}" in paths_str
            self.assertTrue(found, f"Endpoint manquant dans le schéma : {fragment}")
