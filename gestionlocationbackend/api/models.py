from decimal import Decimal

from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.db.models import Sum
from django.utils import timezone

from .soft_delete import SoftDeleteMixin
from .storages import get_client_document_storage, get_public_image_storage
from .utils import calculer_montant_location, nb_jours_location
from .validators import validate_document_file, validate_telephone_format


class Vehicule(SoftDeleteMixin, models.Model):
    STATUTS = [
        ("disponible", "Disponible"),
        ("loue", "Loué"),
        ("maintenance", "En maintenance"),
    ]

    immatriculation = models.CharField(max_length=20, unique=True)
    marque = models.CharField(max_length=50)
    modele = models.CharField(max_length=50)
    categorie = models.CharField(max_length=50)
    prix_journalier = models.DecimalField(max_digits=10, decimal_places=2)
    statut = models.CharField(max_length=20, choices=STATUTS, default="disponible")
    image = models.ImageField(
        upload_to="vehicules/",
        null=True,
        blank=True,
        storage=get_public_image_storage,
    )

    class Meta:
        ordering = ["marque", "modele"]
        indexes = [
            models.Index(fields=["statut"]),
            models.Index(fields=["categorie"]),
        ]

    def __str__(self):
        return f"{self.marque} {self.modele} ({self.immatriculation})"


class Client(SoftDeleteMixin, models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="client_profile",
        null=True,
        blank=True,
    )
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    telephone = models.CharField(max_length=20, validators=[validate_telephone_format])
    num_permis = models.CharField(max_length=50, unique=True, null=True, blank=True)
    num_cni = models.CharField(max_length=50, unique=True, null=True, blank=True)
    photo_profil = models.ImageField(
        upload_to="clients/photos/",
        null=True,
        blank=True,
        storage=get_public_image_storage,
    )
    solde = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    permis_conduire = models.FileField(
        upload_to="documents_clients/permis/",
        null=True,
        blank=True,
        help_text="Scan du permis de conduire",
        validators=[validate_document_file],
        storage=get_client_document_storage,
    )
    piece_identite = models.FileField(
        upload_to="documents_clients/identite/",
        null=True,
        blank=True,
        help_text="Scan de la pièce d'identité",
        validators=[validate_document_file],
        storage=get_client_document_storage,
    )

    class Meta:
        ordering = ["nom", "prenom"]

    def __str__(self):
        return f"{self.nom} {self.prenom}"


class Reservation(models.Model):
    client = models.ForeignKey(
        Client, on_delete=models.CASCADE, related_name="reservations"
    )
    vehicule = models.ForeignKey(
        Vehicule, on_delete=models.CASCADE, related_name="reservations"
    )
    date_debut = models.DateField()
    date_fin = models.DateField()
    date_creation = models.DateTimeField(auto_now_add=True)
    est_annulee = models.BooleanField(default=False)
    total_paye_cache = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Cache du total payé (mis à jour après chaque paiement)",
    )

    class Meta:
        ordering = ["-date_creation"]
        indexes = [
            models.Index(fields=["client", "est_annulee"]),
            models.Index(fields=["vehicule", "date_debut", "date_fin"]),
            models.Index(fields=["-date_creation"]),
            models.Index(fields=["est_annulee"]),
        ]

    @property
    def nb_jours(self) -> int:
        return nb_jours_location(self.date_debut, self.date_fin)

    @property
    def montant_total(self) -> Decimal:
        return calculer_montant_location(self.vehicule, self.date_debut, self.date_fin)

    @property
    def montant_penalites(self) -> Decimal:
        try:
            return self.contrat.penalites_retard
        except Contrat.DoesNotExist:
            return Decimal("0")

    @property
    def montant_du(self) -> Decimal:
        return self.montant_total + self.montant_penalites

    @property
    def total_paye(self) -> Decimal:
        if self.pk:
            return self.total_paye_cache
        return sum((p.montant_paye for p in self.paiements.all()), Decimal("0"))

    def update_total_paye_cache(self):
        total = self.paiements.aggregate(total=Sum("montant_paye"))["total"] or Decimal(
            "0"
        )
        self.total_paye_cache = total
        self.save(update_fields=["total_paye_cache"])

    @property
    def solde_restant(self) -> Decimal:
        return self.montant_du - self.total_paye

    @property
    def est_active(self) -> bool:
        if self.est_annulee:
            return False
        today = timezone.now().date()
        return self.date_debut <= today <= self.date_fin

    @property
    def est_soldee(self) -> bool:
        return self.solde_restant <= Decimal("0")

    def __str__(self):
        return f"Réservation {self.id} - {self.client.nom}"


class Paiement(models.Model):
    MODES = [
        ("especes", "Espèces"),
        ("carte", "Carte"),
        ("virement", "Virement"),
    ]

    reservation = models.ForeignKey(
        Reservation, on_delete=models.CASCADE, related_name="paiements"
    )
    montant_paye = models.DecimalField(max_digits=10, decimal_places=2)
    mode_paiement = models.CharField(max_length=20, choices=MODES)
    est_acompte = models.BooleanField(default=False)
    date_paiement = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date_paiement"]
        indexes = [
            models.Index(fields=["reservation"]),
            models.Index(fields=["mode_paiement"]),
            models.Index(fields=["-date_paiement"]),
        ]

    def __str__(self):
        return f"Paiement {self.id} pour Réservation {self.reservation.id}"


class Maintenance(models.Model):
    TYPES = [
        ("revision", "Révision"),
        ("reparation", "Réparation"),
        ("controle", "Contrôle Technique"),
        ("pneus", "Pneumatiques"),
    ]

    vehicule = models.ForeignKey(
        Vehicule, on_delete=models.CASCADE, related_name="maintenances"
    )
    date_operation = models.DateField()
    type_operation = models.CharField(max_length=20, choices=TYPES)
    description = models.TextField()
    cout = models.DecimalField(max_digits=10, decimal_places=2)
    garage = models.CharField(max_length=100)

    class Meta:
        ordering = ["-date_operation"]

    def __str__(self):
        return f"Maintenance {self.type_operation} - {self.vehicule.immatriculation}"


class Contrat(models.Model):
    reservation = models.OneToOneField(
        Reservation, on_delete=models.CASCADE, related_name="contrat"
    )
    date_signature = models.DateTimeField(auto_now_add=True)
    kilometrage_depart = models.PositiveIntegerField(null=True, blank=True)
    kilometrage_retour = models.PositiveIntegerField(null=True, blank=True)
    penalites_retard = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    fichier_pdf = models.FileField(upload_to="contrats/", null=True, blank=True)

    class Meta:
        ordering = ["-date_signature"]
        indexes = [
            models.Index(fields=["reservation"]),
            models.Index(fields=["kilometrage_retour"]),
        ]

    def __str__(self):
        return f"Contrat {self.id} - Réservation {self.reservation.id}"


class Facture(models.Model):
    TYPES = [
        ("location", "Facture de location"),
        ("acompte", "Facture d'acompte"),
    ]
    STATUTS = [
        ("brouillon", "Brouillon"),
        ("emise", "Émise"),
        ("payee", "Payée"),
        ("annulee", "Annulée"),
    ]

    reservation = models.ForeignKey(
        Reservation, on_delete=models.CASCADE, related_name="factures"
    )
    paiement = models.OneToOneField(
        Paiement,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="facture",
    )
    numero = models.CharField(max_length=30, unique=True)
    type_facture = models.CharField(max_length=20, choices=TYPES, default="location")
    date_emission = models.DateTimeField(auto_now_add=True)
    montant_location = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    montant_penalites = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    montant_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    statut = models.CharField(max_length=20, choices=STATUTS, default="emise")
    fichier_pdf = models.FileField(upload_to="factures/", null=True, blank=True)

    class Meta:
        ordering = ["-date_emission"]
        constraints = [
            models.UniqueConstraint(
                fields=["reservation", "type_facture"],
                name="unique_facture_reservation_type",
            )
        ]

    def __str__(self):
        return f"Facture {self.numero}"


class NotificationLog(models.Model):
    TYPES = [
        ("reservation_creee", "Réservation créée"),
        ("reservation_annulee", "Réservation annulée"),
        ("paiement_recu", "Paiement reçu"),
        ("facture_emise", "Facture emise"),
    ]

    type_notification = models.CharField(max_length=30, choices=TYPES)
    destinataire = models.EmailField()
    sujet = models.CharField(max_length=200)
    corps = models.TextField()
    reservation = models.ForeignKey(
        Reservation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )
    envoye = models.BooleanField(default=False)
    erreur = models.TextField(blank=True)
    date_envoi = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date_envoi"]

    def __str__(self):
        return f"{self.type_notification} → {self.destinataire}"


class ConfigurationMetier(models.Model):
    """Paramètres globaux ajustables sans modifier le code."""

    CATEGORIES = [
        ("penalty", "Pénalités"),
        ("refund", "Remboursement"),
        ("pricing", "Tarification"),
        ("system", "Système"),
    ]

    key = models.CharField(
        max_length=100, unique=True, help_text="Clé unique: PENALTY_MULTIPLICATEUR"
    )
    category = models.CharField(max_length=20, choices=CATEGORIES, default="system")
    value_str = models.TextField(blank=True)
    value_int = models.IntegerField(null=True, blank=True)
    value_decimal = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    value_bool = models.BooleanField(default=False)
    description = models.TextField(help_text="Description pour l'admin")
    last_modified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="config_modifications",
    )
    modified_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Configuration métier"
        verbose_name_plural = "Configurations métier"
        ordering = ["category", "key"]

    @classmethod
    def get(cls, key, default=None):
        try:
            cfg = cls.objects.get(key=key)
        except cls.DoesNotExist:
            return default
        if cfg.value_decimal is not None:
            return cfg.value_decimal
        if cfg.value_int is not None:
            return cfg.value_int
        if cfg.value_str:
            return cfg.value_str
        return default

    @classmethod
    def get_bool(cls, key, default=False):
        try:
            return bool(cls.objects.get(key=key).value_bool)
        except cls.DoesNotExist:
            return default

    def __str__(self):
        valeur = (
            self.value_decimal
            if self.value_decimal is not None
            else (
                self.value_int
                if self.value_int is not None
                else (self.value_bool if self.value_bool else self.value_str)
            )
        )
        return f"{self.key} = {valeur}"


class AuditLog(models.Model):
    """Traçabilité complète de toutes les modifications du système"""

    ACTIONS = [
        ("create", "Créé"),
        ("update", "Modifié"),
        ("delete", "Supprimé"),
        ("cancel", "Annulé"),
        ("finalize", "Finalisé"),
    ]

    # Quoi : quel objet a été modifié
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        help_text="Type d'objet modifié (Reservation, Contrat, etc.)",
    )
    object_id = models.PositiveIntegerField(help_text="ID de l'objet modifié")

    # Action : quoi exactement
    action = models.CharField(
        max_length=10, choices=ACTIONS, help_text="Type de modification"
    )

    # Qui : qui a effectué la modification
    actor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
        help_text="Utilisateur qui a effectué l'action",
    )

    # Avant/Après : les changements
    old_values = models.JSONField(
        default=dict, blank=True, help_text="État de l'objet AVANT la modification"
    )
    new_values = models.JSONField(
        default=dict, blank=True, help_text="État de l'objet APRÈS la modification"
    )

    # Quand : timestamp
    timestamp = models.DateTimeField(
        auto_now_add=True, db_index=True, help_text="Moment de la modification"
    )

    # Où : IP address
    ip_address = models.GenericIPAddressField(
        null=True, blank=True, help_text="Adresse IP du client"
    )

    # Pourquoi : raison de la modification
    change_reason = models.CharField(
        max_length=255, blank=True, help_text="Raison de la modification (optionnel)"
    )

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["content_type", "object_id"]),
            models.Index(fields=["-timestamp"]),
            models.Index(fields=["action"]),
            models.Index(fields=["actor"]),
        ]
        verbose_name = "Log d'audit"
        verbose_name_plural = "Logs d'audit"

    def __str__(self):
        return f"{self.get_action_display()} {self.content_type} #{self.object_id} par {self.actor or 'système'}"

    @property
    def object_label(self):
        """Retourne une description lisible de l'objet modifié"""
        from django.apps import apps

        try:
            model = apps.get_model(self.content_type.app_label, self.content_type.model)
            obj = model.objects.get(pk=self.object_id)
            return str(obj)
        except:
            return f"{self.content_type} #{self.object_id}"
