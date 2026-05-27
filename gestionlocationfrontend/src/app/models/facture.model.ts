export interface Facture {
  id: number;
  reservation: number;
  numero: string;
  type_facture: 'location' | 'acompte';
  date_emission: string;
  montant_location: number;
  montant_penalites: number;
  montant_total: number;
 statut: 'brouillon' | 'emise' | 'payee' | 'annulee';
  fichier_pdf: string | null;
  fichier_pdf_url?: string;
  nom_client?: string;
  vehicule_info?: string;
  reservation_total_paye?: number;
}
