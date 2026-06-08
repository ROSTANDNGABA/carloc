"""Règles métier avant suppression (soft-delete) Client / Vehicule."""

from django.utils import timezone

from .exceptions import DeletionNotAllowedError
from .models import Reservation


def valider_suppression_client(client):
    today = timezone.now().date()
    if Reservation.objects.filter(
        client=client,
        est_annulee=False,
        date_fin__gte=today,
    ).exists():
        raise DeletionNotAllowedError(
            "Impossible de supprimer ce client : réservation(s) active(s) ou à venir.",
            code="client_has_active_reservations",
        )


def valider_suppression_vehicule(vehicule):
    today = timezone.now().date()
    if Reservation.objects.filter(
        vehicule=vehicule,
        est_annulee=False,
        date_fin__gte=today,
    ).exists():
        raise DeletionNotAllowedError(
            "Impossible de supprimer ce véhicule : réservation(s) active(s) ou à venir.",
            code="vehicule_has_active_reservations",
        )
