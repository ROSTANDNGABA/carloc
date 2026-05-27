export interface Client {
  id?: number;
  user?: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  num_permis: string;
  num_cni?: string | null;
  photo_profil?: string | null;
  photo_profil_url?: string | null;
  solde?: number | string;
  adresse?: string;
  permis_conduire?: string;
  piece_identite?: string;
  password?: string;
  password_confirm?: string;
}
