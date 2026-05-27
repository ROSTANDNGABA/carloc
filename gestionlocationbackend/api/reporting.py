"""Indicateurs et statistiques pour le tableau de bord CarLoc."""
from datetime import datetime
from decimal import Decimal

from django.conf import settings
from django.core.cache import cache
from django.db.models import Count, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from .models import Client, Facture, Maintenance, Paiement, Reservation, Vehicule


def _decimal_to_float(value):
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, dict):
        return {k: _decimal_to_float(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_decimal_to_float(v) for v in value]
    return value


def parse_date(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value.date()
    return datetime.strptime(value, '%Y-%m-%d').date()


def filtrer_paiements_par_periode(qs, date_debut=None, date_fin=None):
    if date_debut:
        qs = qs.filter(date_paiement__date__gte=date_debut)
    if date_fin:
        qs = qs.filter(date_paiement__date__lte=date_fin)
    return qs


def calculer_chiffre_affaires(date_debut=None, date_fin=None):
    qs = filtrer_paiements_par_periode(Paiement.objects.all(), date_debut, date_fin)
    return qs.aggregate(total=Sum('montant_paye'))['total'] or Decimal('0')


def calculer_rentabilite_vehicules(date_debut=None, date_fin=None):
    resultats = []
    for vehicule in Vehicule.objects.all():
        resa_qs = Reservation.objects.filter(vehicule=vehicule, est_annulee=False)
        if date_debut:
            resa_qs = resa_qs.filter(date_fin__gte=date_debut)
        if date_fin:
            resa_qs = resa_qs.filter(date_debut__lte=date_fin)

        revenus = Decimal('0')
        for resa in resa_qs.prefetch_related('paiements'):
            paiements = resa.paiements.all()
            if date_debut or date_fin:
                for p in paiements:
                    d = p.date_paiement.date()
                    if date_debut and d < date_debut:
                        continue
                    if date_fin and d > date_fin:
                        continue
                    revenus += p.montant_paye
            else:
                revenus += sum((p.montant_paye for p in paiements), Decimal('0'))

        maint_qs = Maintenance.objects.filter(vehicule=vehicule)
        if date_debut:
            maint_qs = maint_qs.filter(date_operation__gte=date_debut)
        if date_fin:
            maint_qs = maint_qs.filter(date_operation__lte=date_fin)
        couts = maint_qs.aggregate(total=Coalesce(Sum('cout'), Decimal('0')))['total']

        resultats.append({
            'vehicule_id': vehicule.id,
            'immatriculation': vehicule.immatriculation,
            'marque': vehicule.marque,
            'modele': vehicule.modele,
            'categorie': vehicule.categorie,
            'image': vehicule.image.url if vehicule.image else None,
            'revenus': revenus,
            'couts_maintenance': couts,
            'rentabilite': revenus - couts,
            'nb_locations': resa_qs.count(),
        })

    resultats.sort(key=lambda x: x['rentabilite'], reverse=True)
    return resultats


def statistiques_clients(date_debut=None, date_fin=None):
    now = timezone.now()
    debut_mois = now.replace(day=1).date()

    nouveaux_periode = Client.objects.filter(user__isnull=False)
    seuil = date_debut or debut_mois
    nouveaux_periode = nouveaux_periode.filter(user__date_joined__date__gte=seuil)

    clients_actifs = Client.objects.filter(reservations__est_annulee=False).distinct().count()

    top_clients = (
        Client.objects.filter(reservations__est_annulee=False)
        .annotate(nb_reservations=Count('reservations'))
        .order_by('-nb_reservations')[:10]
        .values('id', 'nom', 'prenom', 'email', 'nb_reservations')
    )

    impayes = []
    for client in Client.objects.prefetch_related('reservations__paiements'):
        solde_client = Decimal('0')
        for resa in client.reservations.filter(est_annulee=False):
            if resa.solde_restant > 0 and resa.date_fin < now.date():
                solde_client += resa.solde_restant
        if solde_client > 0:
            impayes.append({
                'client_id': client.id,
                'nom': f'{client.prenom} {client.nom}',
                'email': client.email,
                'solde_impaye': solde_client,
            })

    return {
        'total_clients': Client.objects.count(),
        'clients_nouveaux_periode': nouveaux_periode.count(),
        'clients_actifs': clients_actifs,
        'clients_avec_impayes': len(impayes),
        'top_clients': list(top_clients),
        'clients_impayes': impayes[:20],
    }


def _dashboard_cache_key(date_debut, date_fin):
    d1 = date_debut.isoformat() if date_debut else 'all'
    d2 = date_fin.isoformat() if date_fin else 'all'
    return f'carloc:dashboard:{d1}:{d2}'


def invalidate_dashboard_cache():
    if hasattr(cache, 'delete_pattern'):
        cache.delete_pattern('carloc:dashboard:*')
    else:
        cache.clear()


def get_dashboard_complet(date_debut=None, date_fin=None):
    if getattr(settings, 'DASHBOARD_CACHE_ENABLED', True):
        key = _dashboard_cache_key(date_debut, date_fin)
        cached = cache.get(key)
        if cached is not None:
            return cached

    payload = _compute_dashboard_complet(date_debut, date_fin)

    if getattr(settings, 'DASHBOARD_CACHE_ENABLED', True):
        ttl = getattr(settings, 'DASHBOARD_CACHE_TTL', 300)
        cache.set(_dashboard_cache_key(date_debut, date_fin), payload, timeout=ttl)

    return payload


def _compute_dashboard_complet(date_debut=None, date_fin=None):
    now = timezone.now()
    today = now.date()

    ca_periode = calculer_chiffre_affaires(date_debut, date_fin)
    ca_total = calculer_chiffre_affaires()
    ca_mois = calculer_chiffre_affaires(now.replace(day=1).date(), today)

    total_vehicules = Vehicule.objects.count()
    vehicules_loues = Vehicule.objects.filter(statut='loue').count()
    vehicules_disponibles = Vehicule.objects.filter(statut='disponible').count()
    vehicules_maintenance = Vehicule.objects.filter(statut='maintenance').count()
    taux_occupation = round((vehicules_loues / total_vehicules) * 100, 1) if total_vehicules else 0

    reservations_actives = Reservation.objects.filter(
        date_debut__lte=today, date_fin__gte=today, est_annulee=False,
    ).count()

    reservations_impayees = sum(
        1 for r in Reservation.objects.filter(est_annulee=False).prefetch_related('paiements')
        if r.solde_restant > 0 and r.date_fin < today
    )

    top_vehicules = (
        Reservation.objects.filter(est_annulee=False)
        .values('vehicule__id', 'vehicule__marque', 'vehicule__modele', 'vehicule__immatriculation')
        .annotate(nb_locations=Count('id'))
        .order_by('-nb_locations')[:5]
    )

    vehicules_rentables = calculer_rentabilite_vehicules(date_debut, date_fin)[:10]
    stats_clients = statistiques_clients(date_debut, date_fin)

    return _decimal_to_float({
        'periode': {
            'date_debut': date_debut.isoformat() if date_debut else None,
            'date_fin': date_fin.isoformat() if date_fin else None,
        },
        'chiffre_affaires_periode': ca_periode,
        'chiffre_affaires_total': ca_total,
        'chiffre_affaires_mois': ca_mois,
        'reservations_actives': reservations_actives,
        'reservations_impayees': reservations_impayees,
        'total_vehicules': total_vehicules,
        'vehicules_loues': vehicules_loues,
        'vehicules_disponibles': vehicules_disponibles,
        'vehicules_en_maintenance': vehicules_maintenance,
        'taux_occupation': taux_occupation,
        'vehicules_plus_loues': list(top_vehicules),
        'vehicules_plus_rentables': vehicules_rentables,
        'statistiques_clients': stats_clients,
        'factures_emises': Facture.objects.filter(statut='emise').count(),
    })


def historique_vehicule(vehicule):
    reservations = (
        Reservation.objects.filter(vehicule=vehicule)
        .select_related('client')
        .order_by('-date_debut')
    )
    maintenances = Maintenance.objects.filter(vehicule=vehicule).order_by('-date_operation')

    revenus_total = Decimal('0')
    for resa in reservations.filter(est_annulee=False).prefetch_related('paiements'):
        revenus_total += sum((p.montant_paye for p in resa.paiements.all()), Decimal('0'))

    couts_maintenance = maintenances.aggregate(
        total=Coalesce(Sum('cout'), Decimal('0'))
    )['total']

    return {
        'vehicule': {
            'id': vehicule.id,
            'immatriculation': vehicule.immatriculation,
            'marque': vehicule.marque,
            'modele': vehicule.modele,
            'statut': vehicule.statut,
        },
        'resume': {
            'nb_locations': reservations.filter(est_annulee=False).count(),
            'nb_maintenances': maintenances.count(),
            'revenus_total': revenus_total,
            'couts_maintenance': couts_maintenance,
            'rentabilite': revenus_total - couts_maintenance,
        },
        'locations': [
            {
                'id': r.id,
                'client': f'{r.client.prenom} {r.client.nom}',
                'date_debut': r.date_debut,
                'date_fin': r.date_fin,
                'montant_total': r.montant_total,
                'est_annulee': r.est_annulee,
            }
            for r in reservations
        ],
        'maintenances': [
            {
                'id': m.id,
                'type_operation': m.type_operation,
                'date_operation': m.date_operation,
                'cout': m.cout,
                'garage': m.garage,
                'description': m.description,
            }
            for m in maintenances
        ],
    }


def historique_client(client):
    reservations = (
        Reservation.objects.filter(client=client)
        .select_related('vehicule')
        .prefetch_related('paiements', 'factures')
        .order_by('-date_creation')
    )
    paiements = (
        Paiement.objects.filter(reservation__client=client)
        .select_related('reservation')
        .order_by('-date_paiement')
    )
    factures = Facture.objects.filter(reservation__client=client).order_by('-date_emission')

    total_depense = sum((p.montant_paye for p in paiements), Decimal('0'))

    return {
        'client': {
            'id': client.id,
            'nom': client.nom,
            'prenom': client.prenom,
            'email': client.email,
        },
        'resume': {
            'nb_reservations': reservations.count(),
            'nb_paiements': paiements.count(),
            'total_depense': total_depense,
            'solde_impaye': sum(
                (r.solde_restant for r in reservations if not r.est_annulee and r.solde_restant > 0),
                Decimal('0'),
            ),
        },
        'reservations': [
            {
                'id': r.id,
                'vehicule': f'{r.vehicule.marque} {r.vehicule.modele} ({r.vehicule.immatriculation})',
                'date_debut': r.date_debut,
                'date_fin': r.date_fin,
                'montant_du': r.montant_du,
                'solde_restant': r.solde_restant,
                'est_annulee': r.est_annulee,
            }
            for r in reservations
        ],
        'paiements': [
            {
                'id': p.id,
                'reservation_id': p.reservation_id,
                'montant_paye': p.montant_paye,
                'mode_paiement': p.mode_paiement,
                'est_acompte': p.est_acompte,
                'date_paiement': p.date_paiement,
            }
            for p in paiements
        ],
        'factures': [
            {
                'id': f.id,
                'numero': f.numero,
                'type_facture': f.type_facture,
                'montant_total': f.montant_total,
                'statut': f.statut,
                'fichier_pdf': f.fichier_pdf.url if f.fichier_pdf else None,
            }
            for f in factures
        ],
    }
