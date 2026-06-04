"""Notifications e-mail CarLoc (réservations, paiements, annulations)."""
import logging

import requests
from django.conf import settings
from django.core.mail import send_mail

from .models import NotificationLog

logger = logging.getLogger(__name__)


def _enregistrer_log(type_notif, destinataire, sujet, corps, reservation=None, envoye=True, erreur=''):
    NotificationLog.objects.create(
        type_notification=type_notif,
        destinataire=destinataire,
        sujet=sujet,
        corps=corps,
        reservation=reservation,
        envoye=envoye,
        erreur=erreur,
    )


def _nom_destinataire(reservation=None) -> str:
    if reservation and getattr(reservation, 'client', None):
        client = reservation.client
        return f'{client.prenom} {client.nom}'.strip() or 'Client'
    return 'Client'


def _envoyer_emailjs(destinataire: str, sujet: str, corps: str, reservation=None) -> None:
    required = {
        'EMAILJS_SERVICE_ID': settings.EMAILJS_SERVICE_ID,
        'EMAILJS_TEMPLATE_ID': settings.EMAILJS_TEMPLATE_ID,
        'EMAILJS_PUBLIC_KEY': settings.EMAILJS_PUBLIC_KEY,
    }
    missing = [name for name, value in required.items() if not value]
    if missing:
        raise ValueError(f'Configuration EmailJS incomplete: {", ".join(missing)}')

    payload = {
        'service_id': settings.EMAILJS_SERVICE_ID,
        'template_id': settings.EMAILJS_TEMPLATE_ID,
        'user_id': settings.EMAILJS_PUBLIC_KEY,
        'template_params': {
            'to_email': destinataire,
            'to_name': _nom_destinataire(reservation),
            'subject': sujet,
            'message': corps,
        },
    }
    if settings.EMAILJS_PRIVATE_KEY:
        payload['accessToken'] = settings.EMAILJS_PRIVATE_KEY

    response = requests.post(
        'https://api.emailjs.com/api/v1.0/email/send',
        json=payload,
        timeout=settings.EMAIL_TIMEOUT,
    )
    response.raise_for_status()


def _envoyer_smtp(destinataire: str, sujet: str, corps: str) -> None:
    send_mail(
        subject=sujet,
        message=corps,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[destinataire],
        fail_silently=False,
    )


def envoyer_notification(type_notif, destinataire, sujet, corps, reservation=None) -> bool:
    if not destinataire:
        return False

    try:
        if settings.EMAIL_PROVIDER == 'emailjs':
            _envoyer_emailjs(destinataire, sujet, corps, reservation)
        else:
            _envoyer_smtp(destinataire, sujet, corps)
        _enregistrer_log(type_notif, destinataire, sujet, corps, reservation, envoye=True)
        return True
    except Exception as exc:
        logger.exception('Échec envoi notification CarLoc : %s', exc)
        _enregistrer_log(type_notif, destinataire, sujet, corps, reservation, envoye=False, erreur=str(exc))
        return False


def notifier_reservation_creee(reservation):
    client = reservation.client
    vehicule = reservation.vehicule
    sujet = f'CarLoc — Confirmation réservation #{reservation.id}'
    corps = (
        f'Bonjour {client.prenom} {client.nom},\n\n'
        f'Votre réservation est confirmée.\n'
        f'Véhicule : {vehicule.marque} {vehicule.modele} ({vehicule.immatriculation})\n'
        f'Période : du {reservation.date_debut:%d/%m/%Y} au {reservation.date_fin:%d/%m/%Y}\n'
        f'Montant estimé : {reservation.montant_total} FCFA\n\n'
        f'Cordialement,\nL\'équipe CarLoc'
    )
    envoyer_notification('reservation_creee', client.email, sujet, corps, reservation)

    admin_email = getattr(settings, 'CARLOC_ADMIN_EMAIL', None)
    if admin_email:
        sujet_admin = f'[CarLoc Admin] Nouvelle réservation #{reservation.id}'
        corps_admin = (
            f'Nouvelle réservation de {client.nom} {client.prenom}.\n'
            f'Véhicule : {vehicule.immatriculation}\n'
            f'Période : {reservation.date_debut} — {reservation.date_fin}'
        )
        envoyer_notification('reservation_creee', admin_email, sujet_admin, corps_admin, reservation)


def notifier_reservation_annulee(reservation):
    client = reservation.client
    sujet = f'CarLoc — Annulation réservation #{reservation.id}'
    corps = (
        f'Bonjour {client.prenom},\n\n'
        f'Votre réservation #{reservation.id} a été annulée.\n\n'
        f'CarLoc'
    )
    envoyer_notification('reservation_annulee', client.email, sujet, corps, reservation)


def notifier_paiement_recu(paiement):
    reservation = paiement.reservation
    client = reservation.client
    sujet = f'CarLoc — Paiement reçu ({paiement.montant_paye} FCFA)'
    type_paiement = 'acompte' if paiement.est_acompte else 'paiement'
    corps = (
        f'Bonjour {client.prenom},\n\n'
        f'Nous avons bien reçu votre {type_paiement} de {paiement.montant_paye} FCFA '
        f'(mode : {paiement.get_mode_paiement_display()}).\n'
        f'Réservation #{reservation.id} — Solde restant : {reservation.solde_restant} FCFA\n\n'
        f'CarLoc'
    )
    envoyer_notification('paiement_recu', client.email, sujet, corps, reservation)


def notifier_facture_emise(facture):
    reservation = facture.reservation
    client = reservation.client
    sujet = f'CarLoc - Facture {facture.numero}'
    corps = (
        f'Bonjour {client.prenom},\n\n'
        f'Votre facture {facture.numero} a ete generee pour la reservation #{reservation.id}.\n'
        f'Vehicule : {reservation.vehicule.marque} {reservation.vehicule.modele}\n'
        f'Montant total : {facture.montant_total} FCFA\n'
        f'Statut : {facture.get_statut_display()}\n\n'
        f'Connectez-vous a votre espace client pour consulter ou telecharger le PDF.\n\n'
        f'CarLoc'
    )
    envoyer_notification('facture_emise', client.email, sujet, corps, reservation)
