import logging
from django.conf import settings
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

logger = logging.getLogger("carloc")


def get_twilio_client():
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        return None
    return Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)


def format_whatsapp_number(telephone: str) -> str:
    """
    Formate le numéro de téléphone pour WhatsApp.
    Format attendu par Twilio : whatsapp:+[CountryCode][PhoneNumber]
    Ex: whatsapp:+237690000000
    """
    cleaned = "".join(filter(str.isdigit, str(telephone)))

    # Gestion du préfixe par défaut (ex: Cameroun 237)
    if cleaned.startswith("0"):
        cleaned = f"237{cleaned[1:]}"
    elif (
        not cleaned.startswith("237") and len(cleaned) == 9
    ):  # Numéro local camerounais sans le 0
        cleaned = f"237{cleaned}"

    return f"whatsapp:+{cleaned}"


def envoyer_message_whatsapp(telephone: str, message: str) -> bool:
    """
    Envoie un message WhatsApp via Twilio.
    Retourne True si le message a été envoyé avec succès, False sinon.
    """
    client = get_twilio_client()
    if not client:
        logger.warning(
            "Twilio n'est pas configuré. Le message WhatsApp n'a pas pu être envoyé."
        )
        return False

    if not settings.TWILIO_WHATSAPP_NUMBER:
        logger.warning("TWILIO_WHATSAPP_NUMBER n'est pas configuré.")
        return False

    to_number = format_whatsapp_number(telephone)
    from_number = settings.TWILIO_WHATSAPP_NUMBER

    # Twilio number MUST be in format "whatsapp:+..."
    if not from_number.startswith("whatsapp:"):
        from_number = f"whatsapp:{from_number}"

    try:
        msg = client.messages.create(body=message, from_=from_number, to=to_number)
        logger.info(
            f"Message WhatsApp envoyé avec succès au {to_number} (SID: {msg.sid})"
        )
        return True
    except TwilioRestException as e:
        logger.error(f"Erreur Twilio lors de l'envoi WhatsApp au {to_number}: {e}")
        return False
    except Exception as e:
        logger.exception(
            f"Erreur inattendue lors de l'envoi WhatsApp au {to_number}: {e}"
        )
        return False
