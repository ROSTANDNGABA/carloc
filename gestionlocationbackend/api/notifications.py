"""Notifications e-mail CarLoc (reservations, paiements, annulations)."""
import logging
import traceback

import requests
from django.conf import settings
from django.core.mail import send_mail

from .models import NotificationLog

logger = logging.getLogger(__name__)


def _enregistrer_log(type_notif, destinataire, sujet, corps, reservation=None, envoye=True, erreur=''):
    try:
        NotificationLog.objects.create(
            type_notification=type_notif,
            destinataire=destinataire,
            sujet=sujet,
            corps=corps,
            reservation=reservation,
            envoye=envoye,
            erreur=erreur,
        )
    except Exception as e:
        logger.error('Impossible d\'enregistrer le NotificationLog : %s', e)


def _emailjs_template_id(type_notif):
    templates = {
        'reservation_creee': getattr(settings, 'EMAILJS_TEMPLATE_RESERVATION_ID', ''),
        'reservation_admin': getattr(settings, 'EMAILJS_TEMPLATE_ADMIN_RESERVATION_ID', ''),
        'facture_emise': getattr(settings, 'EMAILJS_TEMPLATE_FACTURE_ID', ''),
    }
    return templates.get(type_notif) or getattr(settings, 'EMAILJS_TEMPLATE_ID', '')


def _envoyer_notification_emailjs(type_notif, destinataire, sujet, corps, params=None) -> None:
    template_id = _emailjs_template_id(type_notif)
    missing = [
        name for name, value in {
            'EMAILJS_SERVICE_ID': getattr(settings, 'EMAILJS_SERVICE_ID', ''),
            'EMAILJS_PUBLIC_KEY': getattr(settings, 'EMAILJS_PUBLIC_KEY', ''),
            'EMAILJS_PRIVATE_KEY': getattr(settings, 'EMAILJS_PRIVATE_KEY', ''),
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


def _envoyer_notification_brevo(destinataire, sujet, corps) -> None:
    """Envoi via l'API HTTP Brevo (ex-Sendinblue). Fonctionne sur Render free tier."""
    api_key = getattr(settings, 'BREVO_API_KEY', '').strip()
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', '').strip()
    from_name = getattr(settings, 'BREVO_FROM_NAME', 'CarLoc').strip()

    if not api_key:
        raise RuntimeError(
            'BREVO_API_KEY manquant. Créez un compte sur brevo.com et ajoutez la clé API sur Render.'
        )
    if not from_email:
        raise RuntimeError('DEFAULT_FROM_EMAIL manquant.')

    response = requests.post(
        'https://api.brevo.com/v3/smtp/email',
        headers={
            'api-key': api_key,
            'Content-Type': 'application/json',
        },
        json={
            'sender': {'name': from_name, 'email': from_email},
            'to': [{'email': destinataire}],
            'subject': sujet,
            'textContent': corps,
        },
        timeout=15,
    )
    if response.status_code not in (200, 201):
        raise RuntimeError(
            f'Brevo API erreur {response.status_code}: {response.text}'
        )


def _envoyer_notification_smtp(sujet, corps, destinataire) -> None:
    """Envoi SMTP via Django. Attention : bloqué sur Render Free tier."""
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', '').strip()
    host_user = getattr(settings, 'EMAIL_HOST_USER', '').strip()
    host_password = getattr(settings, 'EMAIL_HOST_PASSWORD', '').strip()
    backend = getattr(settings, 'EMAIL_BACKEND', '').strip()

    logger.info(
        'SMTP config — backend=%s host=%s port=%s tls=%s user=%s from=%s',
        backend,
        getattr(settings, 'EMAIL_HOST', '').strip(),
        getattr(settings, 'EMAIL_PORT', ''),
        getattr(settings, 'EMAIL_USE_TLS', ''),
        host_user,
        from_email,
    )

    if not host_user or not host_password:
        raise RuntimeError(
            'EMAIL_HOST_USER ou EMAIL_HOST_PASSWORD manquant.'
        )
    if not from_email:
        raise RuntimeError('DEFAULT_FROM_EMAIL manquant.')

    send_mail(
        subject=sujet,
        message=corps,
        from_email=from_email,
        recipient_list=[destinataire],
        fail_silently=False,
    )


def envoyer_notification(type_notif, destinataire, sujet, corps, reservation=None, params=None) -> bool:
    if not destinataire:
        logger.warning('envoyer_notification : destinataire vide, abandon.')
        return False

    provider = getattr(settings, 'EMAIL_PROVIDER', 'django').strip().lower()
    logger.info('Envoi notification type=%s provider=%s to=%s', type_notif, provider, destinataire)

    try:
        if provider == 'emailjs':
            _envoyer_notification_emailjs(type_notif, destinataire, sujet, corps, params=params)
        elif provider == 'brevo':
            _envoyer_notification_brevo(destinataire, sujet, corps)
        else:
            _envoyer_notification_smtp(sujet, corps, destinataire)

        _enregistrer_log(type_notif, destinataire, sujet, corps, reservation, envoye=True)
        logger.info('Notification envoyee avec succes type=%s to=%s', type_notif, provider, destinataire)
        return True

    except Exception as exc:
        erreur_detail = traceback.format_exc()
        logger.error(
            'Echec envoi notification type=%s to=%s provider=%s erreur=%s\n%s',
            type_notif, destinataire, provider, exc, erreur_detail,
        )
        _enregistrer_log(
            type_notif, destinataire, sujet, corps, reservation,
            envoye=False,
            erreur=f'{type(exc).__name__}: {exc}',
        )
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
