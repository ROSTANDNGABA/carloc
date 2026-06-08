import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0005_paiement_est_acompte"),
    ]

    operations = [
        migrations.AddField(
            model_name="client",
            name="permis_conduire",
            field=models.FileField(
                blank=True,
                help_text="Scan du permis de conduire",
                null=True,
                upload_to="documents_clients/permis/",
            ),
        ),
        migrations.AlterField(
            model_name="client",
            name="piece_identite",
            field=models.FileField(
                blank=True,
                help_text="Scan de la pièce d'identité",
                null=True,
                upload_to="documents_clients/identite/",
            ),
        ),
        migrations.CreateModel(
            name="Facture",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("numero", models.CharField(max_length=30, unique=True)),
                (
                    "type_facture",
                    models.CharField(
                        choices=[
                            ("location", "Facture de location"),
                            ("acompte", "Facture d'acompte"),
                        ],
                        default="location",
                        max_length=20,
                    ),
                ),
                ("date_emission", models.DateTimeField(auto_now_add=True)),
                (
                    "montant_location",
                    models.DecimalField(decimal_places=2, default=0, max_digits=12),
                ),
                (
                    "montant_penalites",
                    models.DecimalField(decimal_places=2, default=0, max_digits=12),
                ),
                (
                    "montant_total",
                    models.DecimalField(decimal_places=2, default=0, max_digits=12),
                ),
                (
                    "statut",
                    models.CharField(
                        choices=[
                            ("brouillon", "Brouillon"),
                            ("emise", "Émise"),
                            ("payee", "Payée"),
                            ("annulee", "Annulée"),
                        ],
                        default="emise",
                        max_length=20,
                    ),
                ),
                (
                    "fichier_pdf",
                    models.FileField(blank=True, null=True, upload_to="factures/"),
                ),
                (
                    "paiement",
                    models.OneToOneField(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="facture",
                        to="api.paiement",
                    ),
                ),
                (
                    "reservation",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="factures",
                        to="api.reservation",
                    ),
                ),
            ],
            options={"ordering": ["-date_emission"]},
        ),
        migrations.CreateModel(
            name="NotificationLog",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "type_notification",
                    models.CharField(
                        choices=[
                            ("reservation_creee", "Réservation créée"),
                            ("reservation_annulee", "Réservation annulée"),
                            ("paiement_recu", "Paiement reçu"),
                        ],
                        max_length=30,
                    ),
                ),
                ("destinataire", models.EmailField(max_length=254)),
                ("sujet", models.CharField(max_length=200)),
                ("corps", models.TextField()),
                ("envoye", models.BooleanField(default=False)),
                ("erreur", models.TextField(blank=True)),
                ("date_envoi", models.DateTimeField(auto_now_add=True)),
                (
                    "reservation",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="notifications",
                        to="api.reservation",
                    ),
                ),
            ],
            options={"ordering": ["-date_envoi"]},
        ),
    ]
