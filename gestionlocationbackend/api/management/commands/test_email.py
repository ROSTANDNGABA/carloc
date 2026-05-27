"""Commande : python manage.py test_email [--to email@exemple.com]"""
from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Envoie un e-mail de test pour valider la configuration SMTP CarLoc.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--to',
            type=str,
            default=settings.CARLOC_ADMIN_EMAIL,
            help='Adresse destinataire du test',
        )

    def handle(self, *args, **options):
        destinataire = options['to']
        backend = settings.EMAIL_BACKEND

        self.stdout.write(f'Backend : {backend}')
        self.stdout.write(f'SMTP    : {settings.EMAIL_HOST}:{settings.EMAIL_PORT}')
        self.stdout.write(f'User    : {settings.EMAIL_HOST_USER or "(vide)"}')
        self.stdout.write(f'From    : {settings.DEFAULT_FROM_EMAIL}')
        self.stdout.write(f'To      : {destinataire}')
        self.stdout.write('')

        if 'console' in backend:
            self.stdout.write(self.style.WARNING(
                'Mode CONSOLE : le message s\'affichera ci-dessous, pas d\'envoi réel.'
            ))

        if not settings.EMAIL_HOST_USER and 'smtp' in backend:
            self.stderr.write(self.style.ERROR(
                'EMAIL_HOST_USER est vide. Renseignez votre .env.'
            ))
            return

        if not settings.EMAIL_HOST_PASSWORD and 'smtp' in backend:
            self.stderr.write(self.style.ERROR(
                'EMAIL_HOST_PASSWORD est vide. Utilisez un mot de passe d\'application Gmail.'
            ))
            return

        try:
            send_mail(
                subject='CarLoc — Test de configuration e-mail',
                message=(
                    'Si vous recevez ce message, la configuration SMTP CarLoc fonctionne.\n\n'
                    'Les notifications (réservations, paiements, annulations) seront envoyées '
                    'automatiquement.'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[destinataire],
                fail_silently=False,
            )
            self.stdout.write(self.style.SUCCESS(f'E-mail envoyé avec succès vers {destinataire}.'))
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f'Échec : {exc}'))
            self.stdout.write('')
            self.stdout.write('Vérifications Gmail :')
            self.stdout.write('  1. Validation en 2 étapes activée sur le compte Google')
            self.stdout.write('  2. Mot de passe d\'application créé (pas le mot de passe Gmail habituel)')
            self.stdout.write('  3. EMAIL_HOST=smtp.gmail.com, PORT=587, USE_TLS=True')
            self.stdout.write('  4. DEFAULT_FROM_EMAIL = même adresse que EMAIL_HOST_USER')
