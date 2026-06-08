"""Exceptions API CarLoc avec codes métier standardisés."""

from rest_framework import status
from rest_framework.exceptions import APIException


class CarLocAPIException(APIException):
    """Erreur API structurée : code + message + détails optionnels."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_code = "business_error"
    default_detail = "Erreur métier."

    def __init__(self, detail=None, code=None, details=None):
        self.code = code or self.default_code
        if detail is None:
            detail = self.default_detail
        super().__init__(detail=detail, code=self.code)
        self.details = details or {}


class DeletionNotAllowedError(CarLocAPIException):
    status_code = status.HTTP_409_CONFLICT
    default_code = "deletion_not_allowed"
    default_detail = "Suppression impossible : contraintes métier."


class ReservationNotAllowedError(CarLocAPIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_code = "reservation_not_allowed"
    default_detail = "Réservation non autorisée."


class DuplicateReservationError(CarLocAPIException):
    status_code = status.HTTP_409_CONFLICT
    default_code = "duplicate_reservation"
    default_detail = "Une réservation identique existe déjà."
