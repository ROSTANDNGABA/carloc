import os

from django.conf import settings
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Cree ou met a jour un compte administrateur CarLoc local.'

    def add_arguments(self, parser):
        default_email = os.environ.get('CARLOC_ADMIN_EMAIL', 'admin@carloc.cm')
        parser.add_argument('--username', default=os.environ.get('CARLOC_ADMIN_USERNAME', default_email))
        parser.add_argument('--email', default=default_email)
        parser.add_argument('--password', default=os.environ.get('CARLOC_ADMIN_PASSWORD'))

    def handle(self, *args, **options):
        password = options['password']
        if not password:
            raise CommandError(
                'Definissez CARLOC_ADMIN_PASSWORD dans l environnement ou passez --password.'
            )
        allow_short = settings.DEBUG or os.environ.get(
            'CARLOC_ALLOW_SHORT_ADMIN_PASSWORD', ''
        ).lower() in ('1', 'true', 'yes')
        min_len = 3 if allow_short else 8
        if len(password) < min_len:
            raise CommandError(
                f'Le mot de passe admin doit contenir au moins {min_len} caractere(s). '
                'En local : activez DEBUG=True dans .env, ou definissez '
                'CARLOC_ALLOW_SHORT_ADMIN_PASSWORD=1 pour autoriser un mot de passe court.'
            )
        if allow_short and len(password) < 8:
            self.stdout.write(
                self.style.WARNING(
                    'Mot de passe court : reserve au developpement. '
                    'Ne jamais utiliser en production.'
                )
            )

        user, created = User.objects.get_or_create(
            username=options['username'],
            defaults={'email': options['email']},
        )
        user.email = options['email']
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password(password)
        user.save(update_fields=['email', 'is_staff', 'is_superuser', 'is_active', 'password'])

        action = 'cree' if created else 'mis a jour'
        self.stdout.write(self.style.SUCCESS(f'Compte administrateur {action}: {user.username}'))
