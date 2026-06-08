# Generated manually to relax client identity number formats.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0013_alter_client_photo_profil_alter_vehicule_image'),
    ]

    operations = [
        migrations.AlterField(
            model_name='client',
            name='num_permis',
            field=models.CharField(blank=True, max_length=50, null=True, unique=True),
        ),
        migrations.AlterField(
            model_name='client',
            name='num_cni',
            field=models.CharField(blank=True, max_length=50, null=True, unique=True),
        ),
    ]
