import { Vehicule } from '@app/models/vehicule.model';

export interface VehiculeFormValue {
  immatriculation: string;
  marque: string;
  modele: string;
  categorie: string;
  prix_journalier: number;
  statut: Vehicule['statut'];
}

export const EMPTY_VEHICULE_FORM: VehiculeFormValue = {
  immatriculation: '',
  marque: '',
  modele: '',
  categorie: '',
  prix_journalier: 0,
  statut: 'disponible',
};
