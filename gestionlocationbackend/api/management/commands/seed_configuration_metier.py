"""Initialise les paramètres métier par défaut."""

from decimal import Decimal

from django.core.management.base import BaseCommand

from api.models import ConfigurationMetier

DEFAULTS = [
    {
        "key": "PENALTY_MULTIPLICATEUR",
        "category": "penalty",
        "value_decimal": Decimal("1.5"),
        "description": "Multiplicateur de pénalité par jour de retard",
    },
    {
        "key": "REFUND_RATE_48H",
        "category": "refund",
        "value_decimal": Decimal("1.0"),
        "description": "Taux remboursement >48h avant départ",
    },
    {
        "key": "REFUND_RATE_24H",
        "category": "refund",
        "value_decimal": Decimal("0.8"),
        "description": "Taux remboursement 24-48h avant départ",
    },
    {
        "key": "REFUND_RATE_LATE",
        "category": "refund",
        "value_decimal": Decimal("0.5"),
        "description": "Taux remboursement <24h avant départ",
    },
    {
        "key": "MAX_ACTIVE_RESERVATIONS_PER_CLIENT",
        "category": "system",
        "value_int": 5,
        "description": "Nombre max de réservations actives par client",
    },
    {
        "key": "REQUIRE_CLIENT_DOCUMENTS",
        "category": "system",
        "value_bool": True,
        "description": "Permis et pièce identité obligatoires pour réserver",
    },
]


class Command(BaseCommand):
    help = "Crée ou met à jour les configurations métier CarLoc"

    def handle(self, *args, **options):
        created = 0
        for item in DEFAULTS:
            _, was_created = ConfigurationMetier.objects.update_or_create(
                key=item["key"],
                defaults=item,
            )
            if was_created:
                created += 1
        self.stdout.write(self.style.SUCCESS(f"Configurations OK ({created} créées)."))
