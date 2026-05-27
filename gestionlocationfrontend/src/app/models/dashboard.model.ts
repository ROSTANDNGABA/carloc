export interface VehiculeRentableRow {
  vehicule_id: number;
  immatriculation: string;
  marque: string;
  modele: string;
  categorie?: string;
  image?: string | null;
  revenus: string | number;
  couts_maintenance: string | number;
  rentabilite: string | number;
  nb_locations: number;
}

export interface DashboardApiResponse {
  chiffre_affaires_total: string | number;
  chiffre_affaires_mois: string | number;
  chiffre_affaires_periode: string | number;
  reservations_actives: number;
  reservations_impayees: number;
  total_clients?: number;
  total_vehicules: number;
  vehicules_loues: number;
  vehicules_disponibles: number;
  vehicules_en_maintenance: number;
  taux_occupation: number;
  vehicules_plus_loues: Array<Record<string, unknown>>;
  vehicules_plus_rentables: VehiculeRentableRow[];
  statistiques_clients: {
    total_clients?: number;
    [key: string]: unknown;
  };
}

export interface DashboardViewModel {
  chiffreAffaires: number;
  chiffreAffairesMois: number;
  chiffreAffairesPeriode: number;
  tauxOccupation: number;
  totalClients: number;
  totalVehicules: number;
  vehiculesLoues: number;
  enMaintenance: number;
  disponibles: number;
  reservationsActives: number;
  reservationsImpayees: number;
  recentBookings: ReservationRow[];
  vehiculesPlusRentables: VehiculeRentableRow[];
}

export interface ReservationRow {
  id: number;
  nom_client?: string;
  marque_vehicule?: string;
  modele_vehicule?: string;
  date_debut: string;
  date_fin: string;
  montant_total: string | number;
  est_annulee: boolean;
}
