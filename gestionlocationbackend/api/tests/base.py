from decimal import Decimal

from django.conf import settings
from django.contrib.auth.models import User
from django.test import override_settings
from rest_framework.test import APITestCase

REST_FRAMEWORK_NO_THROTTLE = {
    **settings.REST_FRAMEWORK,
    "DEFAULT_THROTTLE_CLASSES": [],
}

from api.models import Client, ConfigurationMetier, Vehicule


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    REST_FRAMEWORK=REST_FRAMEWORK_NO_THROTTLE,
    CARLOC_DISABLE_LOGIN_THROTTLE=True,
    CELERY_TASK_ALWAYS_EAGER=True,
)
class CarLocTestCase(APITestCase):
    """Base de tests avec utilisateurs admin/client et un véhicule."""

    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin@test.com",
            email="admin@test.com",
            password="admin12345",
            is_staff=True,
        )
        self.client_user = User.objects.create_user(
            username="client@test.com",
            email="client@test.com",
            password="client12345",
        )
        self.client_profile = Client.objects.create(
            user=self.client_user,
            nom="Dupont",
            prenom="Jean",
            email="client@test.com",
            telephone="0601020304",
            num_permis="AB1234567",
        )
        self.vehicule = Vehicule.objects.create(
            immatriculation="AB-123-CD",
            marque="Toyota",
            modele="Yaris",
            categorie="Citadine",
            prix_journalier=Decimal("25000"),
            statut="disponible",
        )
        ConfigurationMetier.objects.update_or_create(
            key="REQUIRE_CLIENT_DOCUMENTS",
            defaults={
                "category": "reservation",
                "value_bool": False,
                "description": "Tests : documents non requis par défaut",
            },
        )
