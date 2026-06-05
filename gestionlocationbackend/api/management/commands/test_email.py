"""Commande : python manage.py test_email [--to email@example.com]."""
from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand

from api.notifications import envoyer_notification


class Command(BaseCommand):
    help = 'Envoie un e-mail de test pour valider la configuration e-mail CarLoc.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--to',
            type=str,
            default=settings.CARLOC_ADMIN_EMAIL,
            help='Adresse destinataire du test',
        )

    def handle(self, *args, **options):
        destinataire = options['to']
        provider = getattr(settings, 'EMAIL_PROVIDER', 'django')

        self.stdout.write(f'Provider: {provider}')
        self.stdout.write(f'Backend : {settings.EMAIL_BACKEND}')
        self.stdout.write(f'SMTP    : {settings.EMAIL_HOST}:{settings.EMAIL_PORT}')
        self.stdout.write(f'User    : {settings.EMAIL_HOST_USER or "(vide)"}')
        self.stdout.write(f'From    : {settings.DEFAULT_FROM_EMAIL}')
        self.stdout.write(f'To      : {destinataire}')
        self.stdout.write('')

        try:
            sujet = 'CarLoc - Test de configuration e-mail'
            message = (
                'Si vous recevez ce message, la configuration e-mail CarLoc fonctionne.\n\n'
                'Les notifications de reservation, admin et facture pourront etre envoyees automatiquement.'
            )

            if provider == 'emailjs':
                ok = envoyer_notification(
                    'reservation_creee',
                    destinataire,
                    sujet,
                    message,
                    params={
                        'to_email': destinataire,
                        'to_name': 'Test CarLoc',
                        'reservation_id': 'TEST',
                        'vehicle': 'Vehicule de test',
                        'period': 'du 01/01/2026 au 02/01/2026',
                        'amount': '10000',
                    },
                )
                if not ok:
                    raise RuntimeError('EmailJS a refuse ou echoue l envoi. Consultez NotificationLog.erreur.')
            else:
                if 'console' in settings.EMAIL_BACKEND:
                    self.stdout.write(self.style.WARNING(
                        'Mode CONSOLE : le message sera affiche dans les logs, pas envoye réellement.'
                    ))

                send_mail(
                    subject=sujet,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[destinataire],
                    fail_silently=False,
                )

            self.stdout.write(self.style.SUCCESS(f'E-mail envoye avec succes vers {destinataire}.'))
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f'Echec : {exc}'))
            self.stdout.write('')
            self.stdout.write('Si vous utilisez EmailJS, verifiez dans Render :')
            self.stdout.write('  EMAIL_PROVIDER=emailjs')
            self.stdout.write('  EMAILJS_SERVICE_ID')
            self.stdout.write('  EMAILJS_TEMPLATE_ID ou EMAILJS_TEMPLATE_RESERVATION_ID')
            self.stdout.write('  EMAILJS_PUBLIC_KEY')
            self.stdout.write('  EMAILJS_PRIVATE_KEY')
