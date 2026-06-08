"""
Logique métier centralisée CarLoc.
Toutes les règles transverses (statuts, contrats, pénalités, factures) passent par ce module.
"""
import logging
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .models import ConfigurationMetier, Contrat, Facture, Paiement, Reservation, Vehicule, AuditLog
from .celery_utils import enqueue_task
from .tasks import (
    send_facture_email,
    send_paiement_received_email,
    send_reservation_cancelled_email,
    send_reservation_created_email,
    send_whatsapp_paiement_received,
)
from .utils import calculer_montant_location, nb_jours_location
from django.contrib.contenttypes.models import ContentType

# Loggers
logger = logging.getLogger('carloc')
audit_logger = logging.getLogger('carloc.audit')

def calculer_penalites_retard(reservation, date_retour) -> Decimal:
    """Multiplicateur configurable × prix journalier par jour de retard."""
    if date_retour <= reservation.date_fin:
        return Decimal('0')
    multiplicateur = ConfigurationMetier.get('PENALTY_MULTIPLICATEUR', Decimal('1.5'))
    jours_retard = (date_retour - reservation.date_fin).days
    return Decimal(jours_retard) * reservation.vehicule.prix_journalier * multiplicateur


def reservations_chevauchantes(vehicule, date_debut, date_fin, exclude_pk=None):
    qs = Reservation.objects.filter(
        vehicule=vehicule,
        date_debut__lt=date_fin,
        date_fin__gt=date_debut,
        est_annulee=False,
    )
    if exclude_pk:
        qs = qs.exclude(pk=exclude_pk)
    return qs


def vehicule_disponible_pour_periode(vehicule, date_debut, date_fin, exclude_reservation_pk=None) -> bool:
    if vehicule.statut == 'maintenance':
        return False
    return not reservations_chevauchantes(
        vehicule, date_debut, date_fin, exclude_pk=exclude_reservation_pk
    ).exists()


def sync_vehicule_statut(vehicule: Vehicule) -> None:
    if vehicule.statut == 'maintenance':
        return

    today = timezone.now().date()
    en_location = Reservation.objects.filter(
        vehicule=vehicule,
        est_annulee=False,
        date_fin__gte=today,
    ).exists()

    nouveau_statut = 'loue' if en_location else 'disponible'
    if vehicule.statut != nouveau_statut:
        vehicule.statut = nouveau_statut
        vehicule.save(update_fields=['statut'])


def generer_numero_facture() -> str:
    year = timezone.now().year
    prefix = f'FAC-{year}-'
    dernier = Facture.objects.filter(numero__startswith=prefix).order_by('-numero').first()
    if dernier:
        try:
            seq = int(dernier.numero.split('-')[-1]) + 1
        except ValueError:
            seq = Facture.objects.filter(numero__startswith=prefix).count() + 1
    else:
        seq = 1
    return f'{prefix}{seq:04d}'


@transaction.atomic
def creer_facture(reservation, type_facture='location', paiement=None, montant=None) -> Facture:
    from .pdf_generators import generer_pdf_facture

    if type_facture == 'acompte':
        if not paiement:
            raise ValueError("Un paiement est nécessaire pour une facture d'acompte.")
        if Facture.objects.filter(paiement=paiement, type_facture='acompte').exists():
            return Facture.objects.get(paiement=paiement, type_facture='acompte')

    if type_facture == 'location':
        facture_existante = reservation.factures.filter(type_facture='location').order_by('-date_emission').first()
        if facture_existante:
            return facture_existante

    if type_facture == 'acompte' and paiement:
        montant_location = Decimal('0')
        montant_penalites = Decimal('0')
        montant_total = paiement.montant_paye
        statut = 'payee'
    else:
        montant_location = reservation.montant_total
        montant_penalites = reservation.montant_penalites
        montant_total = montant or (montant_location + montant_penalites)
        statut = 'payee' if reservation.est_soldee else 'emise'

    facture = Facture.objects.create(
        reservation=reservation,
        paiement=paiement,
        numero=generer_numero_facture(),
        type_facture=type_facture,
        montant_location=montant_location,
        montant_penalites=montant_penalites,
        montant_total=montant_total,
        statut=statut,
    )
    generer_pdf_facture(facture)
    enqueue_task(send_facture_email, facture.id)
    return facture


@transaction.atomic
def mettre_a_jour_facture_location(reservation) -> Facture | None:
    from .pdf_generators import generer_pdf_facture

    facture = reservation.factures.filter(type_facture='location').order_by('-date_emission').first()
    if not facture:
        return creer_facture(reservation, type_facture='location')

    facture.montant_location = reservation.montant_total
    facture.montant_penalites = reservation.montant_penalites
    facture.montant_total = reservation.montant_du
    facture.statut = 'payee' if reservation.est_soldee else 'emise'
    facture.save()
    generer_pdf_facture(facture)
    return facture


@transaction.atomic
def creer_contrat_pour_reservation(reservation: Reservation) -> Contrat:
    from .pdf_generators import generer_pdf_contrat

    contrat, created = Contrat.objects.get_or_create(reservation=reservation)
    if created or not contrat.fichier_pdf:
        generer_pdf_contrat(contrat)
    return contrat


@transaction.atomic
def finaliser_reservation(reservation: Reservation, date_retour=None, kilometrage_retour=None) -> Contrat:
    from .pdf_generators import generer_pdf_contrat

    date_retour = date_retour or timezone.now().date()
    contrat = creer_contrat_pour_reservation(reservation)

    penalites = calculer_penalites_retard(reservation, date_retour)
    contrat.penalites_retard = penalites
    if kilometrage_retour is not None:
        contrat.kilometrage_retour = kilometrage_retour
    contrat.save(update_fields=['penalites_retard', 'kilometrage_retour'])
    generer_pdf_contrat(contrat)

    mettre_a_jour_facture_location(reservation)
    sync_vehicule_statut(reservation.vehicule)
    return contrat


@transaction.atomic
def annuler_reservation(reservation: Reservation) -> Reservation:
    reservation.est_annulee = True
    reservation.save(update_fields=['est_annulee'])
    reservation.factures.filter(statut__in=('emise', 'brouillon')).update(statut='annulee')
    sync_vehicule_statut(reservation.vehicule)
    enqueue_task(send_reservation_cancelled_email, reservation.id)
    return reservation


# ============================================================================
# RÈGLES MÉTIER D'ANNULATION
# ============================================================================

class ReservationCancellationError(ValidationError):
    """Erreur spécifique à l'annulation de réservation"""
    pass


def peut_annuler_reservation(reservation, user=None) -> bool:
    """
    Vérifie si une réservation peut être annulée

    Règles métier:
    - Pas si déjà annulée
    - Pas si en cours (date_debut <= today <= date_fin)
    - Pas si avant 24h du départ (sauf admin)

    Args:
        reservation: La réservation à annuler
        user: L'utilisateur qui effectue l'action (pour vérifier is_staff)

    Returns:
        bool: True si annulation possible

    Raises:
        ReservationCancellationError: Si l'annulation n'est pas possible
    """
    if reservation.est_annulee:
        raise ReservationCancellationError(
            "Cette réservation est déjà annulée.",
            code='already_cancelled'
        )

    today = timezone.now().date()

    # Pas d'annulation si déjà en cours
    if reservation.date_debut <= today <= reservation.date_fin:
        raise ReservationCancellationError(
            "Impossible d'annuler une location en cours.",
            code='reservation_in_progress'
        )

    # Temps avant départ
    heures_avant_depart = (reservation.date_debut - today).days * 24

    is_admin = user and user.is_staff

    # Si moins de 24h et client (non-admin) → bloquer
    if heures_avant_depart < 24 and not is_admin:
        raise ReservationCancellationError(
            f"Annulation impossible: la location débute dans {heures_avant_depart}h. "
            f"Contactez l'administration.",
            code='too_late_for_cancellation'
        )

    return True


def calculer_remboursement_annulation(reservation) -> tuple:
    """
    Calcule le remboursement selon le moment d'annulation

    Règles de remboursement:
    - > 48h avant départ : 100% remboursé
    - 24-48h : 80% remboursé (20% pénalité)
    - < 24h : 50% remboursé (50% pénalité)

    Args:
        reservation: La réservation à annuler

    Returns:
        tuple: (montant_remboursé, montant_pénalité, raison)
    """
    heures_avant = (reservation.date_debut - timezone.now().date()).days * 24

    if heures_avant >= 48:
        taux = ConfigurationMetier.get('REFUND_RATE_48H', Decimal('1.0'))
        raison = "Remboursement complet (>48h)"
    elif heures_avant >= 24:
        taux = ConfigurationMetier.get('REFUND_RATE_24H', Decimal('0.8'))
        raison = "Remboursement 80% (24h-48h)"
    else:
        taux = ConfigurationMetier.get('REFUND_RATE_LATE', Decimal('0.5'))
        raison = "Remboursement 50% (<24h)"

    montant_remboursé = reservation.total_paye * taux
    montant_pénalité = reservation.total_paye * (Decimal('1.0') - taux)

    return montant_remboursé, montant_pénalité, raison


def _log_audit(user, model_class, object_id, action, old_vals=None, new_vals=None, ip_address=None, reason=''):
    """Enregistre un événement d'audit dans la base de données"""
    try:
        content_type = ContentType.objects.get_for_model(model_class)
        AuditLog.objects.create(
            content_type=content_type,
            object_id=object_id,
            action=action,
            actor=user,
            old_values=old_vals or {},
            new_values=new_vals or {},
            ip_address=ip_address,
            change_reason=reason,
        )
    except Exception as e:
        logger.error(f"Erreur lors de l'enregistrement du log d'audit : {e}")


@transaction.atomic
def annuler_reservation_avec_regles(reservation, user=None, ip_address=None, raison='') -> dict:
    """
    Annule une réservation avec vérification des règles métier et calcul du remboursement

    Args:
        reservation: La réservation à annuler
        user: L'utilisateur qui effectue l'action
        ip_address: Adresse IP du client
        raison: Raison de l'annulation

    Returns:
        dict: Informations sur l'annulation
            {
                'reservation_id': int,
                'montant_remboursé': Decimal,
                'montant_pénalité': Decimal,
                'taux_remboursement': str,
            }

    Raises:
        ReservationCancellationError: Si l'annulation n'est pas possible
    """
    # Vérifier les permissions
    peut_annuler_reservation(reservation, user)

    # Calculer le remboursement
    montant_remboursé, montant_pénalité, taux_raison = calculer_remboursement_annulation(reservation)

    # Sauvegarder l'état avant
    ancien_etat = {
        'est_annulee': reservation.est_annulee,
        'montant_paye': float(reservation.total_paye),
    }

    # Enregistrer l'annulation
    reservation.est_annulee = True
    reservation.save(update_fields=['est_annulee'])

    # Annuler les factures non payées
    reservation.factures.filter(statut__in=('emise', 'brouillon')).update(statut='annulee')

    # Mettre à jour le statut du véhicule
    sync_vehicule_statut(reservation.vehicule)

    # Log d'audit
    _log_audit(
        user,
        Reservation,
        reservation.id,
        'cancel',
        old_vals=ancien_etat,
        new_vals={
            'est_annulee': True,
            'montant_remboursé': float(montant_remboursé),
            'montant_pénalité': float(montant_pénalité),
        },
        ip_address=ip_address,
        reason=raison,
    )

    # Log métier
    logger.info(
        "Réservation annulée",
        extra={
            'reservation_id': reservation.id,
            'client_email': reservation.client.email,
            'montant_total': float(reservation.total_paye),
            'montant_remboursé': float(montant_remboursé),
            'montant_pénalité': float(montant_pénalité),
            'taux': taux_raison,
            'user': user.username if user else 'système',
        }
    )

    enqueue_task(send_reservation_cancelled_email, reservation.id)

    return {
        'reservation_id': reservation.id,
        'montant_remboursé': montant_remboursé,
        'montant_pénalité': montant_pénalité,
        'taux_remboursement': taux_raison,
    }


@transaction.atomic
def apres_creation_reservation(reservation: Reservation) -> Reservation:
    from .reporting import invalidate_dashboard_cache

    creer_contrat_pour_reservation(reservation)
    creer_facture(reservation, type_facture='location')
    sync_vehicule_statut(reservation.vehicule)
    enqueue_task(send_reservation_created_email, reservation.id)
    invalidate_dashboard_cache()
    return reservation


@transaction.atomic
def apres_creation_paiement(paiement: Paiement) -> Paiement:
    from .reporting import invalidate_dashboard_cache

    paiement.reservation.update_total_paye_cache()

    if paiement.est_acompte:
        creer_facture(
            paiement.reservation,
            type_facture='acompte',
            paiement=paiement,
            montant=paiement.montant_paye,
        )
    mettre_a_jour_facture_location(paiement.reservation)
    enqueue_task(send_paiement_received_email, paiement.id)
    enqueue_task(send_whatsapp_paiement_received, paiement.id)
    invalidate_dashboard_cache()
    return paiement


@transaction.atomic
def appliquer_maintenance(vehicule: Vehicule) -> None:
    vehicule.statut = 'maintenance'
    vehicule.save(update_fields=['statut'])


@transaction.atomic
def apres_suppression_maintenance(vehicule: Vehicule) -> None:
    if vehicule.statut == 'maintenance':
        vehicule.statut = 'disponible'
        vehicule.save(update_fields=['statut'])
    sync_vehicule_statut(vehicule)
