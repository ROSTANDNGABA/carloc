"""Notifications e-mail CarLoc (reservations, paiements, annulations)."""
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


def _emailjs_template_id(type_notif):
    templates = {
        'reservation_creee': settings.EMAILJS_TEMPLATE_RESERVATION_ID,
        'reservation_admin': settings.EMAILJS_TEMPLATE_ADMIN_RESERVATION_ID,
        'facture_emise': settings.EMAILJS_TEMPLATE_FACTURE_ID,
    }
    return templates.get(type_notif) or settings.EMAILJS_TEMPLATE_ID


def _envoyer_notification_emailjs(type_notif, destinataire, sujet, corps, params=None) -> None:
    template_id = _emailjs_template_id(type_notif)
    missing = [
        name for name, value in {
            'EMAILJS_SERVICE_ID': settings.EMAILJS_SERVICE_ID,
            'EMAILJS_PUBLIC_KEY': settings.EMAILJS_PUBLIC_KEY,
            'EMAILJS_PRIVATE_KEY': settings.EMAILJS_PRIVATE_KEY,
            'EMAILJS_TEMPLATE_ID': template_id,
        }.items()
        if not value
    ]
    if missing:
        raise RuntimeError(f"Configuration EmailJS incomplete: {', '.join(missing)}")

    template_params = {
        'to_email': destinataire,
        'to_name': destinataire,
        'subject': sujet,
        'message': corps,
        'reply_to': getattr(settings, 'CARLOC_ADMIN_EMAIL', ''),
    }
    template_params.update(params or {})

    response = requests.post(
        'https://api.emailjs.com/api/v1.0/email/send',
        json={
            'service_id': settings.EMAILJS_SERVICE_ID,
            'template_id': template_id,
            'user_id': settings.EMAILJS_PUBLIC_KEY,
            'accessToken': settings.EMAILJS_PRIVATE_KEY,
            'template_params': template_params,
        },
        timeout=getattr(settings, 'EMAIL_TIMEOUT', 30),
    )
    response.raise_for_status()


def envoyer_notification(type_notif, destinataire, sujet, corps, reservation=None, params=None) -> bool:
    if not destinataire:
        return False

    try:
        if getattr(settings, 'EMAIL_PROVIDER', 'django') == 'emailjs':
            _envoyer_notification_emailjs(type_notif, destinataire, sujet, corps, params=params)
        else:
            send_mail(
                subject=sujet,
                message=corps,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[destinataire],
                fail_silently=False,
            )
        _enregistrer_log(type_notif, destinataire, sujet, corps, reservation, envoye=True)
        return True
    except Exception as exc:
        logger.exception('Echec envoi notification CarLoc : %s', exc)
        _enregistrer_log(type_notif, destinataire, sujet, corps, reservation, envoye=False, erreur=str(exc))
        return False


def notifier_reservation_creee(reservation):
    client = reservation.client
    vehicule = reservation.vehicule
    vehicle = f'{vehicule.marque} {vehicule.modele} ({vehicule.immatriculation})'
    period = f'du {reservation.date_debut:%d/%m/%Y} au {reservation.date_fin:%d/%m/%Y}'
    amount = f'{reservation.montant_total}'

    sujet = f'CarLoc - Reservation confirmee #{reservation.id}'
    corps = (
        f'Bonjour {client.prenom} {client.nom},\n\n'
        f'Votre reservation est confirmee.\n'
        f'Vehicule : {vehicle}\n'
        f'Periode : {period}\n'
        f'Montant estime : {amount} FCFA\n\n'
        f"Cordialement,\nL'equipe CarLoc"
    )
    envoyer_notification(
        'reservation_creee',
        client.email,
        sujet,
        corps,
        reservation,
        params={
            'to_email': client.email,
            'to_name': f'{client.prenom} {client.nom}',
            'reservation_id': reservation.id,
            'vehicle': vehicle,
            'period': period,
            'amount': amount,
        },
    )

    admin_email = getattr(settings, 'CARLOC_ADMIN_EMAIL', None)
    if admin_email:
        sujet_admin = f'[CarLoc Admin] Nouvelle reservation #{reservation.id}'
        corps_admin = (
            f'Nouvelle reservation de {client.nom} {client.prenom}.\n'
            f'Email client : {client.email}\n'
            f'Vehicule : {vehicle}\n'
            f'Periode : {period}\n'
            f'Montant estime : {amount} FCFA'
        )
        envoyer_notification(
            'reservation_admin',
            admin_email,
            sujet_admin,
            corps_admin,
            reservation,
            params={
                'to_email': admin_email,
                'to_name': 'Administrateur CarLoc',
                'reservation_id': reservation.id,
                'client_name': f'{client.prenom} {client.nom}',
                'client_email': client.email,
                'vehicle': vehicle,
                'period': period,
                'amount': amount,
            },
        )


def notifier_reservation_annulee(reservation):
    client = reservation.client
    sujet = f'CarLoc - Annulation reservation #{reservation.id}'
    corps = (
        f'Bonjour {client.prenom},\n\n'
        f'Votre reservation #{reservation.id} a ete annulee.\n\n'
        f'CarLoc'
    )
    envoyer_notification('reservation_annulee', client.email, sujet, corps, reservation)


def notifier_paiement_recu(paiement):
    reservation = paiement.reservation
    client = reservation.client
    sujet = f'CarLoc - Paiement recu ({paiement.montant_paye} FCFA)'
    type_paiement = 'acompte' if paiement.est_acompte else 'paiement'
    corps = (
        f'Bonjour {client.prenom},\n\n'
        f'Nous avons bien recu votre {type_paiement} de {paiement.montant_paye} FCFA '
        f'(mode : {paiement.get_mode_paiement_display()}).\n'
        f'Reservation #{reservation.id} - Solde restant : {reservation.solde_restant} FCFA\n\n'
        f'CarLoc'
    )
    envoyer_notification('paiement_recu', client.email, sujet, corps, reservation)


def notifier_facture_emise(facture):
    reservation = facture.reservation
    client = reservation.client
    vehicle = f'{reservation.vehicule.marque} {reservation.vehicule.modele}'
    facture_url = ''
    if facture.fichier_pdf:
        facture_url = f"{settings.PUBLIC_BACKEND_URL}{facture.fichier_pdf.url}"

    sujet = f'CarLoc - Facture {facture.numero}'
    corps = (
        f'Bonjour {client.prenom},\n\n'
        f'Votre facture {facture.numero} a ete generee pour la reservation #{reservation.id}.\n'
        f'Vehicule : {vehicle}\n'
        f'Montant total : {facture.montant_total} FCFA\n'
        f'Statut : {facture.get_statut_display()}\n\n'
        f'Connectez-vous a votre espace client pour consulter ou telecharger le PDF.\n\n'
        f'CarLoc'
    )
    envoyer_notification(
        'facture_emise',
        client.email,
        sujet,
        corps,
        reservation,
        params={
            'to_email': client.email,
            'to_name': f'{client.prenom} {client.nom}',
            'reservation_id': reservation.id,
            'invoice_number': facture.numero,
            'vehicle': vehicle,
            'amount': f'{facture.montant_total}',
            'status': facture.get_statut_display(),
            'invoice_url': facture_url,
        },
    )
