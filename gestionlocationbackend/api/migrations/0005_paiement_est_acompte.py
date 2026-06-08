from django.db import migrations, models


def creer_contrats_manquants(apps, schema_editor):
    Reservation = apps.get_model("api", "Reservation")
    Contrat = apps.get_model("api", "Contrat")
    for reservation in Reservation.objects.all():
        Contrat.objects.get_or_create(reservation=reservation)


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0004_alter_paiement_reservation_contrat"),
    ]

    operations = [
        migrations.AddField(
            model_name="paiement",
            name="est_acompte",
            field=models.BooleanField(default=False),
        ),
        migrations.AlterModelOptions(
            name="client",
            options={"ordering": ["nom", "prenom"]},
        ),
        migrations.AlterModelOptions(
            name="contrat",
            options={"ordering": ["-date_signature"]},
        ),
        migrations.AlterModelOptions(
            name="maintenance",
            options={"ordering": ["-date_operation"]},
        ),
        migrations.AlterModelOptions(
            name="paiement",
            options={"ordering": ["-date_paiement"]},
        ),
        migrations.AlterModelOptions(
            name="reservation",
            options={"ordering": ["-date_creation"]},
        ),
        migrations.AlterModelOptions(
            name="vehicule",
            options={"ordering": ["marque", "modele"]},
        ),
        migrations.RunPython(creer_contrats_manquants, migrations.RunPython.noop),
    ]
