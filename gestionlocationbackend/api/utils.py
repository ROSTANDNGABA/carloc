from decimal import Decimal


def nb_jours_location(date_debut, date_fin) -> int:
    return max((date_fin - date_debut).days, 1)


def calculer_montant_location(vehicule, date_debut, date_fin) -> Decimal:
    return Decimal(nb_jours_location(date_debut, date_fin)) * vehicule.prix_journalier
