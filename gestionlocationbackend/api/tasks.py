"""Tâches Celery asynchrones (emails, synchronisation parc)."""

import logging

from celery import shared_task

logger = logging.getLogger('carloc')


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_facture_email(self, facture_id):
    from .models import Facture
    from .notifications import notifier_facture_emise

    try:
        facture = Facture.objects.get(id=facture_id)
        notifier_facture_emise(facture)
        logger.info('Facture %s envoyée par email', facture_id)
        return f'Facture {facture_id} envoyée'
    except Facture.DoesNotExist:
        logger.error('Facture %s introuvable', facture_id)
        return None
    except Exception as exc:
        logger.error('Erreur envoi facture %s: %s', facture_id, exc)
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_reservation_created_email(self, reservation_id):
    from .models import Reservation
    from .notifications import notifier_reservation_creee

    try:
        reservation = Reservation.objects.get(id=reservation_id)
        notifier_reservation_creee(reservation)
        return f'Réservation {reservation_id} notifiée'
    except Reservation.DoesNotExist:
        logger.error('Réservation %s introuvable', reservation_id)
        return None
    except Exception as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_reservation_cancelled_email(self, reservation_id):
    from .models import Reservation
    from .notifications import notifier_reservation_annulee

    try:
        reservation = Reservation.objects.get(id=reservation_id)
        notifier_reservation_annulee(reservation)
        return f'Annulation {reservation_id} notifiée'
    except Reservation.DoesNotExist:
        return None
    except Exception as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_paiement_received_email(self, paiement_id):
    from .models import Paiement
    from .notifications import notifier_paiement_recu

    try:
        paiement = Paiement.objects.get(id=paiement_id)
        notifier_paiement_recu(paiement)
        return f'Paiement {paiement_id} notifié'
    except Paiement.DoesNotExist:
        return None
    except Exception as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)


@shared_task
def sync_all_vehicle_status():
    from .models import Vehicule
    from .services import sync_vehicule_statut

    for vehicule in Vehicule.all_objects.filter(is_active=True):
        sync_vehicule_statut(vehicule)

    logger.info('Synchronisation des statuts véhicules terminée')
    return 'ok'
