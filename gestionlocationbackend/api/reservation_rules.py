"""Règles métier de création / modification de réservation."""

from datetime import timedelta

from django.utils import timezone

from .exceptions import DuplicateReservationError, ReservationNotAllowedError
from .models import ConfigurationMetier, Reservation


def _get_int_config(key: str, default: int) -> int:
    value = ConfigurationMetier.get(key, default)
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _require_client_documents() -> bool:
    return ConfigurationMetier.get_bool("REQUIRE_CLIENT_DOCUMENTS", default=False)


def valider_eligibilite_reservation(
    client, date_debut, date_fin, exclude_reservation_pk=None
):
    """
    Vérifie que le client peut réserver (documents, limite de réservations actives, doublon récent).
    """
    if date_debut < timezone.now().date():
        raise ReservationNotAllowedError(
            "La date de début ne peut pas être dans le passé.",
            code="date_in_past",
        )

    if _require_client_documents():
        if not (client.permis_conduire or client.num_permis):
            raise ReservationNotAllowedError(
                "Numéro de permis requis pour réserver.",
                code="missing_permis_document",
                details={"field": "num_permis"},
            )
        if not (client.piece_identite or client.num_cni):
            raise ReservationNotAllowedError(
                "Numéro CNI requis pour réserver.",
                code="missing_identity_document",
                details={"field": "num_cni"},
            )

    today = timezone.now().date()
    active_qs = Reservation.objects.filter(
        client=client,
        est_annulee=False,
        date_fin__gte=today,
    )
    if exclude_reservation_pk:
        active_qs = active_qs.exclude(pk=exclude_reservation_pk)

    max_active = _get_int_config("MAX_ACTIVE_RESERVATIONS_PER_CLIENT", 5)
    if active_qs.count() >= max_active:
        raise ReservationNotAllowedError(
            f"Limite atteinte : {max_active} réservation(s) active(s) maximum.",
            code="max_active_reservations",
            details={"max": max_active},
        )

    duplicate_qs = Reservation.objects.filter(
        client=client,
        date_debut=date_debut,
        date_fin=date_fin,
        est_annulee=False,
        date_creation__gte=timezone.now() - timedelta(minutes=5),
    )
    if exclude_reservation_pk:
        duplicate_qs = duplicate_qs.exclude(pk=exclude_reservation_pk)
    if duplicate_qs.exists():
        raise DuplicateReservationError(
            "Une réservation identique a été créée récemment.",
            details={"hint": "Vérifiez vos réservations en cours."},
        )
