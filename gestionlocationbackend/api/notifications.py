"""Notifications e-mail et WhatsApp CarLoc (reservations, paiements, annulations)."""

import logging
import traceback

import requests
from django.conf import settings
from django.core.mail import send_mail
from twilio.rest import Client

from .models import NotificationLog

logger = logging.getLogger(__name__)


def envoyer_notification_whatsapp(numero_telephone, message):
    """Envoie une notification WhatsApp via Twilio."""
    try:
        account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', None)
        auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', None)
        whatsapp_number = getattr(settings, 'TWILIO_WHATSAPP_NUMBER', None)
        
        if not all([account_sid, auth_token, whatsapp_number]):
            logger.warning("Configuration Twilio incomplete, WhatsApp non envoye")
            return False
        
        # Formater le numéro pour WhatsApp
        if not numero_telephone.startswith('whatsapp:'):
            numero_telephone = f'whatsapp:{numero_telephone}'
        
        client = Client(account_sid, auth_token)
        message_obj = client.messages.create(
            body=message,
            from_=whatsapp_number,
            to=numero_telephone
        )
        
        logger.info(f"WhatsApp envoye avec succes, SID: {message_obj.sid}")
        return True
        
    except Exception as exc:
        logger.error(f"Erreur envoi WhatsApp: {exc}")
        return False


def _enregistrer_log(
    type_notif, destinataire, sujet, corps, reservation=None, envoye=True, erreur=""
):
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
        logger.error("Impossible d'enregistrer le NotificationLog : %s", e)


def _emailjs_template_id(type_notif):
    templates = {
        "reservation_creee": getattr(settings, "EMAILJS_TEMPLATE_RESERVATION_ID", ""),
        "reservation_admin": getattr(
            settings, "EMAILJS_TEMPLATE_ADMIN_RESERVATION_ID", ""
        ),
        "facture_emise": getattr(settings, "EMAILJS_TEMPLATE_FACTURE_ID", ""),
    }
    return templates.get(type_notif) or getattr(settings, "EMAILJS_TEMPLATE_ID", "")


def _envoyer_notification_emailjs(
    type_notif, destinataire, sujet, corps, params=None
) -> None:
    template_id = _emailjs_template_id(type_notif)
    missing = [
        name
        for name, value in {
            "EMAILJS_SERVICE_ID": getattr(settings, "EMAILJS_SERVICE_ID", ""),
            "EMAILJS_PUBLIC_KEY": getattr(settings, "EMAILJS_PUBLIC_KEY", ""),
            "EMAILJS_PRIVATE_KEY": getattr(settings, "EMAILJS_PRIVATE_KEY", ""),
            "EMAILJS_TEMPLATE_ID": template_id,
        }.items()
        if not value
    ]
    if missing:
        raise RuntimeError(f"Configuration EmailJS incomplete: {', '.join(missing)}")

    template_params = {
        "to_email": destinataire,
        "to_name": destinataire,
        "subject": sujet,
        "message": corps,
        "reply_to": getattr(settings, "CARLOC_ADMIN_EMAIL", ""),
    }
    template_params.update(params or {})

    response = requests.post(
        "https://api.emailjs.com/api/v1.0/email/send",
        json={
            "service_id": settings.EMAILJS_SERVICE_ID,
            "template_id": template_id,
            "user_id": settings.EMAILJS_PUBLIC_KEY,
            "accessToken": settings.EMAILJS_PRIVATE_KEY,
            "template_params": template_params,
        },
        timeout=getattr(settings, "EMAIL_TIMEOUT", 30),
    )
    response.raise_for_status()





def _envoyer_notification_smtp(sujet, corps, destinataire) -> None:
    """Envoi SMTP via Django. Attention : bloqué sur Render Free tier."""
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "").strip()
    host_user = getattr(settings, "EMAIL_HOST_USER", "").strip()
    host_password = getattr(settings, "EMAIL_HOST_PASSWORD", "").strip()
    backend = getattr(settings, "EMAIL_BACKEND", "").strip()

    logger.info(
        "SMTP config — backend=%s host=%s port=%s tls=%s user=%s from=%s",
        backend,
        getattr(settings, "EMAIL_HOST", "").strip(),
        getattr(settings, "EMAIL_PORT", ""),
        getattr(settings, "EMAIL_USE_TLS", ""),
        host_user,
        from_email,
    )

    if not host_user or not host_password:
        raise RuntimeError("EMAIL_HOST_USER ou EMAIL_HOST_PASSWORD manquant.")
    if not from_email:
        raise RuntimeError("DEFAULT_FROM_EMAIL manquant.")

    send_mail(
        subject=sujet,
        message=corps,
        from_email=from_email,
        recipient_list=[destinataire],
        fail_silently=False,
    )


def envoyer_notification(
    type_notif, destinataire, sujet, corps, reservation=None, params=None
) -> bool:
    if not destinataire:
        logger.warning("envoyer_notification : destinataire vide, abandon.")
        return False

    provider = getattr(settings, "EMAIL_PROVIDER", "django").strip().lower()
    logger.info(
        "Envoi notification type=%s provider=%s to=%s",
        type_notif,
        provider,
        destinataire,
    )

    try:
        if provider == "emailjs":
            _envoyer_notification_emailjs(
                type_notif, destinataire, sujet, corps, params=params
            )
        else:
            # anymail (brevo/resend) or django smtp
            _envoyer_notification_smtp(sujet, corps, destinataire)

        _enregistrer_log(
            type_notif, destinataire, sujet, corps, reservation, envoye=True
        )
        logger.info(
            "Notification envoyee avec succes type=%s provider=%s to=%s",
            type_notif,
            provider,
            destinataire,
        )
        return True

    except Exception as exc:
        erreur_detail = traceback.format_exc()
        logger.error(
            "Echec envoi notification type=%s to=%s provider=%s erreur=%s\n%s",
            type_notif,
            destinataire,
            provider,
            exc,
            erreur_detail,
        )
        _enregistrer_log(
            type_notif,
            destinataire,
            sujet,
            corps,
            reservation,
            envoye=False,
            erreur=f"{type(exc).__name__}: {exc}",
        )
        return False


def notifier_reservation_creee(reservation):
    client = reservation.client
    vehicule = reservation.vehicule
    vehicle = f"{vehicule.marque} {vehicule.modele} ({vehicule.immatriculation})"
    period = f"du {reservation.date_debut:%d/%m/%Y} au {reservation.date_fin:%d/%m/%Y}"
    amount = f"{reservation.montant_total}"

    # Notification WhatsApp au client
    if client.telephone:
        message_whatsapp = (
            f"🚗 *Reservation confirmee #{reservation.id}*\n\n"
            f"Bonjour {client.prenom},\n\n"
            f"Votre reservation est confirmee !\n"
            f"📌 Vehicule : {vehicle}\n"
            f"📅 Periode : {period}\n"
            f"💰 Montant : {amount} FCFA\n\n"
            f"Merci de votre confiance !\n"
            f"L'equipe CarLoc"
        )
        envoyer_notification_whatsapp(client.telephone, message_whatsapp)

    # Notification Email à l'admin
    admin_email = getattr(settings, "CARLOC_ADMIN_EMAIL", None)
    if admin_email:
        sujet_admin = f"[CarLoc Admin] Nouvelle reservation #{reservation.id}"
        corps_admin = (
            f"Nouvelle reservation recue !\n\n"
            f"Client : {client.prenom} {client.nom}\n"
            f"Email : {client.email}\n"
            f"Telephone : {client.telephone or 'Non renseigne'}\n\n"
            f"Vehicule : {vehicle}\n"
            f"Periode : {period}\n"
            f"Montant : {amount} FCFA\n"
            f"Statut : {reservation.get_statut_display()}\n\n"
            f"Voir details : {settings.PUBLIC_BACKEND_URL}/admin/api/reservation/{reservation.id}/change/"
        )
        envoyer_notification(
            "reservation_admin",
            admin_email,
            sujet_admin,
            corps_admin,
            reservation,
        )


def notifier_reservation_annulee(reservation):
    client = reservation.client
    
    # Notification WhatsApp au client
    if client.telephone:
        message_whatsapp = (
            f"❌ *Reservation annulee #{reservation.id}*\n\n"
            f"Bonjour {client.prenom},\n\n"
            f"Votre reservation a ete annulee.\n"
            f"Vehicule : {reservation.vehicule.marque} {reservation.vehicule.modele}\n\n"
            f"Pour toute question, contactez-nous.\n"
            f"CarLoc"
        )
        envoyer_notification_whatsapp(client.telephone, message_whatsapp)
    
    # Notification Email à l'admin
    admin_email = getattr(settings, "CARLOC_ADMIN_EMAIL", None)
    if admin_email:
        sujet_admin = f"[CarLoc Admin] Annulation reservation #{reservation.id}"
        corps_admin = (
            f"Une reservation a ete annulee.\n\n"
            f"Client : {client.prenom} {client.nom}\n"
            f"Reservation : #{reservation.id}\n"
            f"Vehicule : {reservation.vehicule.marque} {reservation.vehicule.modele}\n"
            f"Montant rembourse : {reservation.montant_total} FCFA"
        )
        envoyer_notification('annulation_admin', admin_email, sujet_admin, corps_admin, reservation)


def notifier_paiement_recu(paiement):
    reservation = paiement.reservation
    client = reservation.client
    type_paiement = "acompte" if paiement.est_acompte else "paiement"
    
    # Notification WhatsApp au client
    if client.telephone:
        message_whatsapp = (
            f"💰 *Paiement recu*\n\n"
            f"Bonjour {client.prenom},\n\n"
            f"Nous avons bien recu votre {type_paiement} :\n"
            f"💵 Montant : {paiement.montant_paye} FCFA\n"
            f"💳 Mode : {paiement.get_mode_paiement_display()}\n"
            f"📋 Reservation : #{reservation.id}\n"
            f"📊 Solde restant : {reservation.solde_restant} FCFA\n\n"
            f"Merci !\n"
            f"CarLoc"
        )
        envoyer_notification_whatsapp(client.telephone, message_whatsapp)
    
    # Notification Email à l'admin
    admin_email = getattr(settings, "CARLOC_ADMIN_EMAIL", None)
    if admin_email:
        sujet_admin = f"[CarLoc Admin] Paiement recu - Reservation #{reservation.id}"
        corps_admin = (
            f"Un paiement a ete enregistre.\n\n"
            f"Client : {client.prenom} {client.nom}\n"
            f"Type : {type_paiement.capitalize()}\n"
            f"Montant : {paiement.montant_paye} FCFA\n"
            f"Mode : {paiement.get_mode_paiement_display()}\n"
            f"Reservation : #{reservation.id}\n"
            f"Solde restant : {reservation.solde_restant} FCFA\n"
            f"Total reservation : {reservation.montant_total} FCFA"
        )
        envoyer_notification('paiement_admin', admin_email, sujet_admin, corps_admin, reservation)


def notifier_facture_emise(facture):
    reservation = facture.reservation
    client = reservation.client
    vehicle = f"{reservation.vehicule.marque} {reservation.vehicule.modele}"
    facture_url = ""
    if facture.fichier_pdf:
        facture_url = f"{settings.PUBLIC_BACKEND_URL}{facture.fichier_pdf.url}"

    # Notification WhatsApp au client
    if client.telephone:
        envoyer_notification_whatsapp(
            client.telephone,
            f"🧾 *Facture {facture.numero}*\n\n"
            f"Bonjour {client.prenom},\n\n"
            f"Votre facture pour la reservation #{reservation.id} est disponible.\n"
            f"Vehicule : {vehicle}\n"
            f"Montant : {facture.montant_total} FCFA\n"
            f"Statut : {facture.get_statut_display()}\n\n"
            f"Connectez-vous pour telecharger : {settings.PUBLIC_BACKEND_URL}\n\n"
            f"CarLoc"
        )
    
    # Notification Email à l'admin
    admin_email = getattr(settings, "CARLOC_ADMIN_EMAIL", None)
    if admin_email:
        sujet_admin = f"[CarLoc Admin] Facture {facture.numero} emise"
        corps_admin = (
            f"Une facture a ete generee.\n\n"
            f"Client : {client.prenom} {client.nom} ({client.email})\n"
            f"Facture : {facture.numero}\n"
            f"Reservation : #{reservation.id}\n"
            f"Vehicule : {vehicle}\n"
            f"Montant : {facture.montant_total} FCFA\n"
            f"Statut : {facture.get_statut_display()}\n\n"
            f"PDF : {facture_url if facture_url else 'Non disponible'}"
        )
        envoyer_notification(
            'facture_admin',
            admin_email,
            sujet_admin,
            corps_admin,
            reservation,
        )
