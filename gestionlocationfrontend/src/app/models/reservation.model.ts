import { Client } from './client.model';
import { Vehicule } from './vehicule.model';

export interface Reservation {
  id?: number;
  client: number | Client;
  vehicule: number | Vehicule;
  date_debut: string;
  date_fin: string;
  date_creation?: string;
  est_annulee: boolean;

  // Champs calculés par l'API
  nom_client?: string;
  prenom_client?: string;
  marque_vehicule?: string;
  modele_vehicule?: string;
  categorie_vehicule?: string;
  image_vehicule?: string | null;
  image_vehicule_url?: string | null;
  immatriculation?: string;
  nb_jours?: number;
  montant_total?: number;
  montant_penalites?: number;
  montant_du?: number;
  total_paye?: number;
  solde_restant?: number;
  est_active?: boolean;
  est_soldee?: boolean;
  contrat_id?: number | null;
}
