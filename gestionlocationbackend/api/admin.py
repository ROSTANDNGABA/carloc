from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from django.urls import reverse
from django.utils.html import format_html

from .models import (
    AuditLog,
    Client,
    ConfigurationMetier,
    Contrat,
    Facture,
    Maintenance,
    NotificationLog,
    Paiement,
    Reservation,
    Vehicule,
)


# --- Inlines ---

class PaiementInline(admin.TabularInline):
    model = Paiement
    extra = 0
    fields = ('montant_paye', 'mode_paiement', 'est_acompte', 'date_paiement')
    readonly_fields = ('date_paiement',)
    show_change_link = True


class FactureInline(admin.TabularInline):
    model = Facture
    extra = 0
    fields = ('numero', 'type_facture', 'montant_total', 'statut', 'date_emission')
    readonly_fields = ('numero', 'montant_total', 'statut', 'date_emission')
    show_change_link = True


class ContratInline(admin.StackedInline):
    model = Contrat
    extra = 0
    max_num = 1
    fields = (
        'kilometrage_depart',
        'kilometrage_retour',
        'penalites_retard',
        'fichier_pdf',
        'date_signature',
    )
    readonly_fields = ('date_signature',)


# --- Modèles métier ---

@admin.register(Vehicule)
class VehiculeAdmin(admin.ModelAdmin):
    list_display = (
        'apercu_image',
        'marque',
        'modele',
        'immatriculation',
        'categorie',
        'prix_journalier',
        'badge_statut',
    )
    list_filter = ('statut', 'categorie', 'marque')
    search_fields = ('immatriculation', 'marque', 'modele', 'categorie')
    list_per_page = 25
    ordering = ('marque', 'modele')
    readonly_fields = ('apercu_image_large',)
    fieldsets = (
        ('Identification', {
            'fields': ('immatriculation', 'marque', 'modele', 'categorie'),
        }),
        ('Tarification & disponibilité', {
            'fields': ('prix_journalier', 'statut'),
        }),
        ('Visuel', {
            'fields': ('image', 'apercu_image_large'),
        }),
    )

    @admin.display(description='Photo')
    def apercu_image(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" alt="" style="height:40px;width:56px;object-fit:contain;'
                'border-radius:6px;background:#f0f4f8;" />',
                obj.image.url,
            )
        return '—'

    @admin.display(description='Aperçu')
    def apercu_image_large(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" alt="" style="max-height:200px;border-radius:8px;" />',
                obj.image.url,
            )
        return 'Aucune image'

    @admin.display(description='Statut', ordering='statut')
    def badge_statut(self, obj):
        colors = {
            'disponible': '#0f766e',
            'loue': '#1d4ed8',
            'maintenance': '#a15c07',
        }
        bg = {
            'disponible': '#e7f6f3',
            'loue': '#eaf1ff',
            'maintenance': '#fff7df',
        }
        label = dict(Vehicule.STATUTS).get(obj.statut, obj.statut)
        return format_html(
            '<span style="display:inline-block;padding:0.25rem 0.55rem;border-radius:999px;'
            'font-size:0.78rem;font-weight:700;color:{};background:{};">{}</span>',
            colors.get(obj.statut, '#475467'),
            bg.get(obj.statut, '#eef2f7'),
            label,
        )


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = (
        'nom_complet',
        'email',
        'telephone',
        'num_permis',
        'solde',
        'compte_lie',
    )
    list_filter = ()
    search_fields = ('nom', 'prenom', 'email', 'telephone', 'num_permis', 'num_cni')
    list_per_page = 25
    autocomplete_fields = ('user',)
    readonly_fields = ('apercu_photo',)
    fieldsets = (
        ('Identité', {
            'fields': ('nom', 'prenom', 'email', 'telephone', 'user'),
        }),
        ('Documents', {
            'fields': (
                'num_permis',
                'num_cni',
                'photo_profil',
                'apercu_photo',
                'permis_conduire',
                'piece_identite',
            ),
        }),
        ('Compte', {
            'fields': ('solde',),
        }),
    )

    @admin.display(description='Client', ordering='nom')
    def nom_complet(self, obj):
        return f'{obj.prenom} {obj.nom}'

    @admin.display(description='Compte Django', boolean=True)
    def compte_lie(self, obj):
        return obj.user_id is not None

    @admin.display(description='Photo profil')
    def apercu_photo(self, obj):
        if obj.photo_profil:
            return format_html(
                '<img src="{}" alt="" style="max-height:120px;border-radius:8px;" />',
                obj.photo_profil.url,
            )
        return '—'


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'client',
        'vehicule',
        'date_debut',
        'date_fin',
        'badge_annulee',
        'date_creation',
    )
    list_filter = ('est_annulee', 'date_debut', 'vehicule__statut')
    search_fields = (
        'client__nom',
        'client__prenom',
        'client__email',
        'vehicule__immatriculation',
        'vehicule__marque',
    )
    date_hierarchy = 'date_debut'
    list_per_page = 25
    autocomplete_fields = ('client', 'vehicule')
    readonly_fields = ('date_creation', 'lien_historique_audit')
    inlines = [ContratInline, PaiementInline, FactureInline]
    fieldsets = (
        ('Location', {
            'fields': ('client', 'vehicule', 'date_debut', 'date_fin'),
        }),
        ('État', {
            'fields': ('est_annulee', 'date_creation', 'lien_historique_audit'),
        }),
    )

    @admin.display(description='Historique d\'audit')
    def lien_historique_audit(self, obj):
        if not obj.pk:
            return '—'
        ct = ContentType.objects.get_for_model(Reservation)
        url = (
            reverse('admin:api_auditlog_changelist')
            + f'?content_type__id__exact={ct.id}&object_id__exact={obj.pk}'
        )
        return format_html('<a href="{}">Consulter les logs d\'audit</a>', url)

    @admin.display(description='Annulée', boolean=True, ordering='est_annulee')
    def badge_annulee(self, obj):
        if obj.est_annulee:
            return format_html(
                '<span style="color:#b42318;font-weight:700;">Oui</span>',
            )
        return format_html(
            '<span style="color:#0f766e;font-weight:700;">Non</span>',
        )


@admin.register(Paiement)
class PaiementAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'reservation',
        'montant_paye',
        'mode_paiement',
        'est_acompte',
        'date_paiement',
    )
    list_filter = ('mode_paiement', 'est_acompte', 'date_paiement')
    search_fields = ('reservation__client__nom', 'reservation__client__email')
    date_hierarchy = 'date_paiement'
    list_per_page = 30
    autocomplete_fields = ('reservation',)
    readonly_fields = ('date_paiement',)


@admin.register(Maintenance)
class MaintenanceAdmin(admin.ModelAdmin):
    list_display = (
        'vehicule',
        'type_operation',
        'date_operation',
        'cout',
        'garage',
    )
    list_filter = ('type_operation', 'date_operation')
    search_fields = ('vehicule__immatriculation', 'garage', 'description')
    date_hierarchy = 'date_operation'
    autocomplete_fields = ('vehicule',)
    fieldsets = (
        ('Véhicule & planning', {
            'fields': ('vehicule', 'date_operation', 'type_operation'),
        }),
        ('Détails', {
            'fields': ('description', 'cout', 'garage'),
        }),
    )


@admin.register(Contrat)
class ContratAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'reservation',
        'date_signature',
        'kilometrage_depart',
        'kilometrage_retour',
        'penalites_retard',
        'lien_pdf',
    )
    search_fields = (
        'reservation__client__nom',
        'reservation__client__email',
        'reservation__vehicule__immatriculation',
    )
    autocomplete_fields = ('reservation',)
    readonly_fields = ('date_signature',)

    @admin.display(description='PDF')
    def lien_pdf(self, obj):
        if obj.fichier_pdf:
            return format_html(
                '<a href="{}" target="_blank" rel="noopener">Télécharger</a>',
                obj.fichier_pdf.url,
            )
        return '—'


@admin.register(Facture)
class FactureAdmin(admin.ModelAdmin):
    list_display = (
        'numero',
        'reservation',
        'type_facture',
        'montant_total',
        'badge_statut',
        'date_emission',
        'lien_pdf',
    )
    list_filter = ('statut', 'type_facture', 'date_emission')
    search_fields = ('numero', 'reservation__client__email', 'reservation__client__nom')
    date_hierarchy = 'date_emission'
    readonly_fields = ('numero', 'date_emission', 'montant_total')
    autocomplete_fields = ('reservation', 'paiement')
    fieldsets = (
        ('Référence', {
            'fields': ('numero', 'reservation', 'paiement', 'type_facture', 'statut'),
        }),
        ('Montants', {
            'fields': ('montant_location', 'montant_penalites', 'montant_total'),
        }),
        ('Document', {
            'fields': ('fichier_pdf', 'date_emission'),
        }),
    )

    @admin.display(description='Statut', ordering='statut')
    def badge_statut(self, obj):
        colors = {
            'brouillon': '#475467',
            'emise': '#1d4ed8',
            'payee': '#0f766e',
            'annulee': '#b42318',
        }
        label = dict(Facture.STATUTS).get(obj.statut, obj.statut)
        return format_html(
            '<span style="font-weight:700;color:{};">{}</span>',
            colors.get(obj.statut, '#475467'),
            label,
        )

    @admin.display(description='PDF')
    def lien_pdf(self, obj):
        if obj.fichier_pdf:
            return format_html(
                '<a href="{}" target="_blank" rel="noopener">PDF</a>',
                obj.fichier_pdf.url,
            )
        return '—'


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = (
        'type_notification',
        'destinataire',
        'sujet_court',
        'badge_envoye',
        'erreur_courte',
        'date_envoi',
    )
    list_filter = ('type_notification', 'envoye', 'date_envoi')
    search_fields = ('destinataire', 'sujet', 'corps', 'erreur')
    date_hierarchy = 'date_envoi'
    readonly_fields = (
        'type_notification',
        'destinataire',
        'sujet',
        'corps',
        'reservation',
        'envoye',
        'erreur',
        'date_envoi',
    )
    list_per_page = 40
    actions = ['renvoyer_emails_echoues']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    @admin.display(description='Sujet')
    def sujet_court(self, obj):
        if len(obj.sujet) > 48:
            return f'{obj.sujet[:45]}…'
        return obj.sujet

    @admin.display(description='Envoyé', ordering='envoye')
    def badge_envoye(self, obj):
        if obj.envoye:
            return format_html('<span style="color:#0f766e;font-weight:700;">✓ OK</span>')
        return format_html('<span style="color:#b42318;font-weight:700;">✗ Échec</span>')

    @admin.display(description='Erreur')
    def erreur_courte(self, obj):
        if not obj.erreur:
            return '—'
        texte = obj.erreur[:80] + '…' if len(obj.erreur) > 80 else obj.erreur
        return format_html(
            '<span style="color:#b42318;font-size:0.8em;" title="{}">{}</span>',
            obj.erreur,
            texte,
        )

    @admin.action(description='Renvoyer les emails sélectionnés (échoués)')
    def renvoyer_emails_echoues(self, request, queryset):
        from .notifications import envoyer_notification
        succes, echecs = 0, 0
        for log in queryset.filter(envoye=False):
            ok = envoyer_notification(
                log.type_notification,
                log.destinataire,
                log.sujet,
                log.corps,
                log.reservation,
            )
            if ok:
                succes += 1
            else:
                echecs += 1
        self.message_user(
            request,
            f'{succes} email(s) renvoyé(s) avec succès. {echecs} échec(s).',
            level='success' if not echecs else 'warning',
        )


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = (
        'timestamp',
        'action_badge',
        'content_type',
        'object_label',
        'actor',
        'ip_address',
    )
    list_filter = ('action', 'timestamp', 'content_type', 'actor')
    search_fields = ('object_id', 'change_reason', 'actor__username', 'actor__email', 'ip_address')
    date_hierarchy = 'timestamp'
    readonly_fields = (
        'content_type',
        'object_id',
        'action',
        'actor',
        'old_values',
        'new_values',
        'timestamp',
        'ip_address',
        'change_reason',
    )
    list_per_page = 50
    ordering = ['-timestamp']

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    @admin.display(description='Action', ordering='action')
    def action_badge(self, obj):
        colors = {
            'create': '#0f766e',
            'update': '#1d4ed8',
            'delete': '#b42318',
            'cancel': '#a15c07',
            'finalize': '#059669',
        }
        labels = dict(AuditLog.ACTIONS)
        return format_html(
            '<span style="display:inline-block;padding:0.25rem 0.55rem;border-radius:999px;'
            'font-size:0.78rem;font-weight:700;color:white;background:{};">{}</span>',
            colors.get(obj.action, '#475467'),
            labels.get(obj.action, obj.action),
        )

    def object_label(self, obj):
        return obj.object_label


@admin.register(ConfigurationMetier)
class ConfigurationMetierAdmin(admin.ModelAdmin):
    list_display = ('key', 'category', 'valeur_affichage', 'description', 'modified_at')
    list_filter = ('category', 'modified_at')
    search_fields = ('key', 'description')
    readonly_fields = ('modified_at',)
    fieldsets = (
        ('Identification', {
            'fields': ('key', 'category', 'description'),
        }),
        ('Valeur', {
            'fields': ('value_str', 'value_int', 'value_decimal', 'value_bool'),
            'description': 'Remplir une seule valeur selon le type attendu.',
        }),
        ('Audit', {
            'fields': ('last_modified_by', 'modified_at'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='Valeur')
    def valeur_affichage(self, obj):
        if obj.value_decimal is not None:
            return obj.value_decimal
        if obj.value_int is not None:
            return obj.value_int
        if obj.value_bool:
            return obj.value_bool
        return obj.value_str or '—'

    def save_model(self, request, obj, form, change):
        obj.last_modified_by = request.user
        super().save_model(request, obj, form, change)


# --- Utilisateurs Django (staff / admin) ---

admin.site.unregister(User)


@admin.register(User)
class CarLocUserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active', 'date_joined')
    list_filter = ('is_staff', 'is_superuser', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('-date_joined',)
