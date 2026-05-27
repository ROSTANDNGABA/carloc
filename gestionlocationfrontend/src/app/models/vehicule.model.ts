export interface Vehicule {
  id?: number;
  immatriculation: string;
  marque: string;
  modele: string;
  categorie: string;
  prix_journalier: number;
  statut: 'disponible' | 'loue' | 'maintenance';
  image?: string;
}
