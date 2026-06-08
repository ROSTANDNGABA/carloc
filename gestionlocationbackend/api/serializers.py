from decimal import Decimal

from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from drf_spectacular.utils import OpenApiTypes, extend_schema_field

from .models import Client, Contrat, Facture, Maintenance, NotificationLog, Paiement, Reservation, Vehicule
from .validators import (
    validate_document_file,
    validate_telephone_format,
)
from .reservation_rules import valider_eligibilite_reservation
from .services import (
    appliquer_maintenance,
    apres_creation_paiement,
    apres_creation_reservation,
    sync_vehicule_statut,
    vehicule_disponible_pour_periode,
)


class CarLocTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['email'] = user.email
        token['role'] = user_role(user)
        token['is_staff'] = user.is_staff
        token['is_superuser'] = user.is_superuser
        if hasattr(user, 'client_profile'):
            token['client_id'] = user.client_profile.id
        return token

    @staticmethod
    def _resolve_django_username(raw_identifier: str) -> str:
        """
        Le champ JWT « username » doit correspondre au username Django.
        Les clients créés via l'API ont username = email ; on accepte aussi
        l'email (casse différente) ou le prénom si un seul profil client correspond.
        """
        raw = (raw_identifier or '').strip()
        if not raw:
            return raw

        user = User.objects.filter(username__iexact=raw).first()
        if user:
            return user.username

        user = User.objects.filter(email__iexact=raw).first()
        if user:
            return user.username

        client = (
            Client.objects.filter(email__iexact=raw, user_id__isnull=False)
            .select_related('user')
            .first()
        )
        if client and client.user_id:
            return client.user.username

        prenom_qs = Client.objects.filter(prenom__iexact=raw, user_id__isnull=False).select_related('user')
        if prenom_qs.count() == 1:
            return prenom_qs.first().user.username

        return raw

    def validate(self, attrs):
        attrs = dict(attrs)
        attrs['username'] = self._resolve_django_username(attrs.get('username', ''))
        data = super().validate(attrs)
        client_id = None
        photo_profil = None
        nom = None
        prenom = None
        if hasattr(self.user, 'client_profile'):
            client_id = self.user.client_profile.id
            photo_profil = self.user.client_profile.photo_profil.url if self.user.client_profile.photo_profil else None
            nom = self.user.client_profile.nom
            prenom = self.user.client_profile.prenom

        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'role': user_role(self.user),
            'is_staff': self.user.is_staff,
            'is_superuser': self.user.is_superuser,
            'client_id': client_id,
            'photo_profil': photo_profil,
            'nom': nom,
            'prenom': prenom,
        }
        data['role'] = data['user']['role']
        data['client_id'] = client_id
        return data


def user_role(user):
    if user.is_superuser:
        return 'admin'
    if user.is_staff:
        return 'gestionnaire'
    return 'client'


class GestionnaireSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, required=False)
    chiffre_affaires = serializers.FloatField(read_only=True, default=0)
    locations_realisees = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_active', 'date_joined', 'password',
            'chiffre_affaires', 'locations_realisees',
        ]
        read_only_fields = ['date_joined', 'chiffre_affaires', 'locations_realisees']

    def validate(self, attrs):
        username = (attrs.get('username') or getattr(self.instance, 'username', '')).strip()
        email = (attrs.get('email') or getattr(self.instance, 'email', '')).strip().lower()

        if not username:
            raise serializers.ValidationError({'username': 'Le nom utilisateur est obligatoire.'})
        if not email:
            raise serializers.ValidationError({'email': 'L email est obligatoire.'})

        qs = User.objects.all()
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.filter(username__iexact=username).exists():
            raise serializers.ValidationError({'username': 'Ce nom utilisateur existe deja.'})
        if qs.filter(email__iexact=email).exists():
            raise serializers.ValidationError({'email': 'Cet email est deja utilise.'})
        if self.instance is None and not attrs.get('password'):
            raise serializers.ValidationError({'password': 'Le mot de passe est obligatoire.'})

        attrs['username'] = username
        attrs['email'] = email
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.is_staff = True
        user.is_superuser = False
        user.save(update_fields=['password', 'is_staff', 'is_superuser'])
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.is_staff = True
        instance.is_superuser = False
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class VehiculeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicule
        fields = '__all__'

    def validate_prix_journalier(self, value):
        if value <= 0:
            raise serializers.ValidationError('Le prix journalier doit être strictement positif.')
        return value

    def validate_immatriculation(self, value):
        value = value.strip().upper()
        instance = self.instance
        
        if instance:
            if Vehicule.objects.filter(immatriculation=value).exclude(pk=instance.pk).exists():
                raise serializers.ValidationError('Cette plaque d\'immatriculation existe déjà.')
        else:
            if Vehicule.objects.filter(immatriculation=value).exists():
                raise serializers.ValidationError('Cette plaque d\'immatriculation existe déjà.')
        
        return value

    def validate(self, attrs):
        instance = self.instance
        nouveau_statut = attrs.get('statut')
        if instance:
            ancien_statut = instance.statut
            if nouveau_statut is None:
                nouveau_statut = ancien_statut

            if nouveau_statut != 'maintenance' and nouveau_statut != ancien_statut:
                if nouveau_statut in ('disponible', 'loue'):
                    attrs.pop('statut', None)
        
        if instance and nouveau_statut == 'disponible':
            from django.utils import timezone
            today = timezone.now().date()
            en_location = instance.reservations.filter(
                est_annulee=False,
                date_debut__lte=today,
                date_fin__gte=today,
            ).exists()
            
            if en_location:
                raise serializers.ValidationError(
                    {'statut': 'Impossible de mettre ce véhicule en disponible : il est actuellement en location.'}
                )
        
        return attrs


class VehiculeDisponibiliteSerializer(serializers.Serializer):
    date_debut = serializers.DateField()
    date_fin = serializers.DateField()
    disponible = serializers.BooleanField(read_only=True)
    message = serializers.CharField(read_only=True, allow_blank=True)

    def validate(self, attrs):
        if attrs['date_debut'] >= attrs['date_fin']:
            raise serializers.ValidationError(
                {'date_fin': 'La date de fin doit être postérieure à la date de début.'}
            )
        return attrs


class ClientSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, required=False)
    password_confirm = serializers.CharField(write_only=True, required=False)
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    photo_profil_url = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            'id', 'user', 'nom', 'prenom', 'email', 'telephone',
            'num_permis', 'num_cni', 'photo_profil', 'photo_profil_url', 'solde',
            'permis_conduire', 'piece_identite',
            'password', 'password_confirm',
        ]

    @extend_schema_field(OpenApiTypes.URI)
    def get_photo_profil_url(self, obj) -> str | None:
        request = self.context.get('request')
        if obj.photo_profil and request:
            return request.build_absolute_uri(obj.photo_profil.url)
        return obj.photo_profil.url if obj.photo_profil else None

    def validate_telephone(self, value):
        validate_telephone_format(value)
        return value

    def validate_permis_conduire(self, value):
        if value:
            validate_document_file(value)
        return value

    def validate_piece_identite(self, value):
        if value:
            validate_document_file(value)
        return value

    def validate(self, attrs):
        for field in ('nom', 'prenom', 'email', 'telephone', 'num_permis', 'num_cni'):
            if field in attrs and isinstance(attrs[field], str):
                attrs[field] = attrs[field].strip()

        if 'email' in attrs:
            attrs['email'] = attrs['email'].lower()
        if 'num_permis' in attrs:
            attrs['num_permis'] = attrs['num_permis'].upper() or None
        if 'num_cni' in attrs:
            attrs['num_cni'] = attrs['num_cni'].upper() or None

        solde = attrs.get('solde')
        if solde is not None and solde < 0:
            raise serializers.ValidationError({'solde': 'Le solde ne peut pas etre negatif.'})

        if self.instance is None:
            password = attrs.get('password')
            password_confirm = attrs.get('password_confirm')
            email = attrs.get('email')
            num_permis = attrs.get('num_permis')
            num_cni = attrs.get('num_cni')

            if not password:
                raise serializers.ValidationError({'password': 'Le mot de passe est obligatoire.'})
            if len(password) < 8:
                raise serializers.ValidationError(
                    {'password': 'Le mot de passe doit contenir au moins 8 caractères.'}
                )
            if password != password_confirm:
                raise serializers.ValidationError(
                    {'password_confirm': 'Les mots de passe ne correspondent pas.'}
                )
            if email and Client.objects.filter(email__iexact=email).exists():
                raise serializers.ValidationError({'email': 'Un client existe deja avec cet email.'})
            if num_permis and Client.objects.filter(num_permis__iexact=num_permis).exists():
                raise serializers.ValidationError(
                    {'num_permis': 'Un client existe deja avec ce numero de permis.'}
                )
            if num_cni and Client.objects.filter(num_cni__iexact=num_cni).exists():
                raise serializers.ValidationError(
                    {'num_cni': 'Un client existe deja avec ce numero de CNI.'}
                )
            if email and User.objects.filter(username=email).exists():
                raise serializers.ValidationError({'email': 'Un compte existe déjà avec cet email.'})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop('password')
        validated_data.pop('password_confirm', None)

        try:
            user = User.objects.create_user(
                username=validated_data['email'],
                email=validated_data['email'],
                password=password,
                first_name=validated_data.get('prenom', ''),
                last_name=validated_data.get('nom', ''),
            )
            return Client.objects.create(user=user, **validated_data)
        except IntegrityError as exc:
            raise serializers.ValidationError(
                {'detail': 'Impossible de creer le client : email ou numero de permis deja utilise.'}
            ) from exc

    @transaction.atomic
    def update(self, instance, validated_data):
        validated_data.pop('password', None)
        validated_data.pop('password_confirm', None)

        email = validated_data.get('email')
        if email and User.objects.filter(username=email).exclude(pk=instance.user_id).exists():
            raise serializers.ValidationError({'email': 'Un compte existe deja avec cet email.'})

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if instance.user:
            instance.user.email = instance.email
            instance.user.username = instance.email
            instance.user.first_name = instance.prenom
            instance.user.last_name = instance.nom
            instance.user.save(update_fields=['email', 'username', 'first_name', 'last_name'])

        return instance


class ReservationSerializer(serializers.ModelSerializer):
    nom_client = serializers.CharField(source='client.nom', read_only=True)
    prenom_client = serializers.CharField(source='client.prenom', read_only=True)
    marque_vehicule = serializers.CharField(source='vehicule.marque', read_only=True)
    modele_vehicule = serializers.CharField(source='vehicule.modele', read_only=True)
    immatriculation = serializers.CharField(source='vehicule.immatriculation', read_only=True)
    nb_jours = serializers.IntegerField(read_only=True)
    montant_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True, coerce_to_string=False)
    montant_penalites = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True, coerce_to_string=False)
    montant_du = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True, coerce_to_string=False)
    total_paye = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True, coerce_to_string=False)
    solde_restant = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True, coerce_to_string=False)
    est_active = serializers.BooleanField(read_only=True)
    est_soldee = serializers.BooleanField(read_only=True)
    contrat_id = serializers.SerializerMethodField()

    class Meta:
        model = Reservation
        fields = [
            'id', 'client', 'vehicule', 'date_debut', 'date_fin', 'date_creation',
            'est_annulee', 'nom_client', 'prenom_client', 'marque_vehicule',
            'modele_vehicule', 'immatriculation', 'nb_jours', 'montant_total',
            'montant_penalites', 'montant_du', 'total_paye', 'solde_restant',
            'est_active', 'est_soldee', 'contrat_id', 'total_paye_cache',
        ]
        read_only_fields = ['date_creation', 'est_annulee', 'total_paye_cache']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['total_paye'] = float(instance.total_paye_cache)
        return ret

    @extend_schema_field(OpenApiTypes.INT)
    def get_contrat_id(self, obj) -> int | None:
        try:
            return obj.contrat.id
        except Contrat.DoesNotExist:
            return None

    def validate(self, attrs):
        instance = self.instance
        debut = attrs.get('date_debut', getattr(instance, 'date_debut', None))
        fin = attrs.get('date_fin', getattr(instance, 'date_fin', None))
        vehicule = attrs.get('vehicule', getattr(instance, 'vehicule', None))
        client = attrs.get('client', getattr(instance, 'client', None))

        if instance and instance.est_annulee:
            raise serializers.ValidationError('Cette réservation est annulée et ne peut plus être modifiée.')

        if debut and fin and debut >= fin:
            raise serializers.ValidationError(
                {'date_fin': 'La date de fin doit être postérieure à la date de début.'}
            )

        if vehicule and debut and fin:
            if vehicule.statut == 'maintenance':
                raise serializers.ValidationError(
                    {'vehicule': 'Ce véhicule est en maintenance et ne peut pas être réservé.'}
                )

            exclude_pk = instance.pk if instance else None
            if not vehicule_disponible_pour_periode(vehicule, debut, fin, exclude_reservation_pk=exclude_pk):
                raise serializers.ValidationError(
                    {'vehicule': 'Le véhicule est déjà réservé sur cette période.'}
                )

        request = self.context.get('request')
        if request and not request.user.is_staff and client:
            if hasattr(request.user, 'client_profile'):
                if client.id != request.user.client_profile.id:
                    raise serializers.ValidationError(
                        {'client': 'Vous ne pouvez créer une réservation que pour votre propre compte.'}
                    )

        if client and debut and fin:
            exclude_pk = instance.pk if instance else None
            valider_eligibilite_reservation(client, debut, fin, exclude_reservation_pk=exclude_pk)

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get('request')
        if request and not request.user.is_staff and hasattr(request.user, 'client_profile'):
            validated_data['client'] = request.user.client_profile

        reservation = Reservation.objects.create(**validated_data)
        apres_creation_reservation(reservation)
        return reservation

    @transaction.atomic
    def update(self, instance, validated_data):
        if instance.est_annulee:
            raise serializers.ValidationError('Impossible de modifier une réservation annulée.')

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        sync_vehicule_statut(instance.vehicule)
        return instance


class ReservationAnnulationSerializer(serializers.Serializer):
    message = serializers.CharField(read_only=True)
    reservation_id = serializers.IntegerField(read_only=True, required=False)
    montant_rembourse = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True, required=False
    )
    montant_penalite = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True, required=False
    )
    taux_remboursement = serializers.CharField(read_only=True, required=False)


class PaiementSerializer(serializers.ModelSerializer):
    nom_client = serializers.CharField(source='reservation.client.nom', read_only=True)
    reservation_montant_du = serializers.DecimalField(
        source='reservation.montant_du', max_digits=12, decimal_places=2, read_only=True
    )
    reservation_solde_restant = serializers.DecimalField(
        source='reservation.solde_restant', max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = Paiement
        fields = [
            'id', 'reservation', 'montant_paye', 'mode_paiement',
            'est_acompte', 'date_paiement', 'nom_client',
            'reservation_montant_du', 'reservation_solde_restant',
        ]
        read_only_fields = ['date_paiement']

    def validate(self, attrs):
        reservation = attrs.get('reservation') or getattr(self.instance, 'reservation', None)
        montant = attrs.get('montant_paye', getattr(self.instance, 'montant_paye', None))

        if reservation and reservation.est_annulee:
            raise serializers.ValidationError(
                {'reservation': 'Impossible d\'enregistrer un paiement pour une réservation annulée.'}
            )

        if montant is not None and montant <= 0:
            raise serializers.ValidationError(
                {'montant_paye': 'Le montant doit être strictement positif.'}
            )

        if reservation and montant is not None:
            solde = reservation.solde_restant
            if self.instance:
                solde += self.instance.montant_paye
            if montant > solde:
                raise serializers.ValidationError(
                    {
                        'montant_paye': (
                            f'Le montant dépasse le solde restant ({solde} FCFA).'
                        )
                    }
                )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        paiement = super().create(validated_data)
        apres_creation_paiement(paiement)
        sync_vehicule_statut(paiement.reservation.vehicule)
        return paiement


class MaintenanceSerializer(serializers.ModelSerializer):
    immatriculation_vehicule = serializers.CharField(source='vehicule.immatriculation', read_only=True)

    class Meta:
        model = Maintenance
        fields = '__all__'

    def validate(self, attrs):
        vehicule = attrs.get('vehicule') or getattr(self.instance, 'vehicule', None)
        date_operation = attrs.get('date_operation') or getattr(self.instance, 'date_operation', None)

        if vehicule and date_operation and Reservation.objects.filter(
            vehicule=vehicule,
            est_annulee=False,
            date_debut__lte=date_operation,
            date_fin__gte=date_operation,
        ).exists():
            raise serializers.ValidationError(
                {'vehicule': 'Impossible de planifier une maintenance : véhicule en location active.'}
            )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        maintenance = super().create(validated_data)
        appliquer_maintenance(maintenance.vehicule)
        return maintenance


class ContratSerializer(serializers.ModelSerializer):
    reservation_details = ReservationSerializer(source='reservation', read_only=True)
    montant_location = serializers.DecimalField(
        source='reservation.montant_total', max_digits=12, decimal_places=2, read_only=True
    )
    solde_reservation = serializers.DecimalField(
        source='reservation.solde_restant', max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = Contrat
        fields = [
            'id', 'reservation', 'reservation_details', 'date_signature',
            'kilometrage_depart', 'kilometrage_retour', 'penalites_retard',
            'fichier_pdf', 'montant_location', 'solde_reservation',
        ]
        read_only_fields = ['date_signature']

    def validate(self, attrs):
        instance = self.instance
        km_depart = attrs.get('kilometrage_depart', getattr(instance, 'kilometrage_depart', None))
        km_retour = attrs.get('kilometrage_retour', getattr(instance, 'kilometrage_retour', None))

        if km_depart is not None and km_retour is not None and km_retour < km_depart:
            raise serializers.ValidationError(
                {'kilometrage_retour': 'Le kilométrage de retour doit être supérieur ou égal au départ.'}
            )
        return attrs

    @transaction.atomic
    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class ContratClotureSerializer(serializers.Serializer):
    date_retour = serializers.DateField(required=False)
    kilometrage_retour = serializers.IntegerField(required=False, min_value=0)


class FactureSerializer(serializers.ModelSerializer):
    nom_client = serializers.CharField(source='reservation.client.nom', read_only=True)
    vehicule_info = serializers.SerializerMethodField()
    fichier_pdf_url = serializers.SerializerMethodField()
    reservation_total_paye = serializers.DecimalField(
        source='reservation.total_paye', max_digits=12, decimal_places=2, read_only=True, coerce_to_string=False
    )
    montant_location = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True, coerce_to_string=False)
    montant_penalites = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True, coerce_to_string=False)
    montant_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True, coerce_to_string=False)

    class Meta:
        model = Facture
        fields = [
            'id', 'reservation', 'paiement', 'numero', 'type_facture',
            'date_emission', 'montant_location', 'montant_penalites', 'montant_total',
            'statut', 'fichier_pdf', 'fichier_pdf_url', 'nom_client', 'vehicule_info',
            'reservation_total_paye',
        ]
        read_only_fields = [
            'numero', 'date_emission', 'montant_location', 'montant_penalites',
            'montant_total', 'fichier_pdf',
        ]

    @extend_schema_field(OpenApiTypes.STR)
    def get_vehicule_info(self, obj) -> str:
        v = obj.reservation.vehicule
        return f'{v.marque} {v.modele} ({v.immatriculation})'

    @extend_schema_field(OpenApiTypes.URI)
    def get_fichier_pdf_url(self, obj) -> str | None:
        request = self.context.get('request')
        if obj.fichier_pdf and request:
            return request.build_absolute_uri(obj.fichier_pdf.url)
        return obj.fichier_pdf.url if obj.fichier_pdf else None


class NotificationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationLog
        fields = '__all__'
        read_only_fields = [
            'type_notification', 'destinataire', 'sujet', 'corps',
            'reservation', 'envoye', 'erreur', 'date_envoi',
        ]
