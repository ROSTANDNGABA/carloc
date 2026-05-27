import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { PaginatedResponse, unwrapPaginated } from '../utils/api.util';

export interface Paiement {
  id: number;
  reservation: number;
  montant_paye: number;
  mode_paiement: string;
  est_acompte: boolean;
  date_paiement: string;
  nom_client?: string;
  reservation_montant_du?: number;
  reservation_solde_restant?: number;
}

export interface Contrat {
  id: number;
  reservation: number;
  date_signature: string;
  kilometrage_depart: number | null;
  kilometrage_retour: number | null;
  penalites_retard: number;
  fichier_pdf: string | null;
  montant_location?: number;
  solde_reservation?: number;
  reservation_details?: any;
}

export interface MaintenanceItem {
  id: number;
  vehicule: number;
  date_operation: string;
  type_operation: string;
  description: string;
  cout: number;
  garage: string;
  immatriculation_vehicule?: string;
}

export interface Gestionnaire {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  date_joined: string;
  chiffre_affaires?: number;
  locations_realisees?: number;
  historique_locations?: Array<{
    id: number;
    client: string;
    vehicule: string;
    date_debut: string;
    date_fin: string;
    montant_total: number;
    total_paye: number;
    est_annulee: boolean;
  }>;
}

export interface GestionnairePayload {
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  password?: string;
  is_active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getGestionnaires(): Observable<Gestionnaire[]> {
    return this.http.get<PaginatedResponse<Gestionnaire> | Gestionnaire[]>(`${this.api}/gestionnaires/`)
      .pipe(map(d => unwrapPaginated(d)));
  }

  getGestionnairesStats(): Observable<Gestionnaire[]> {
    return this.http.get<Gestionnaire[]>(`${this.api}/gestionnaires/stats/`);
  }

  createGestionnaire(data: GestionnairePayload): Observable<Gestionnaire> {
    return this.http.post<Gestionnaire>(`${this.api}/gestionnaires/`, data);
  }

  updateGestionnaire(id: number, data: Partial<GestionnairePayload>): Observable<Gestionnaire> {
    return this.http.patch<Gestionnaire>(`${this.api}/gestionnaires/${id}/`, data);
  }

  deleteGestionnaire(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/gestionnaires/${id}/`);
  }

  // Paiements
  getPaiements(): Observable<Paiement[]> {
    return this.http.get<PaginatedResponse<Paiement> | Paiement[]>(`${this.api}/paiements/`)
      .pipe(map(d => unwrapPaginated(d)));
  }
  createPaiement(data: Partial<Paiement>): Observable<Paiement> {
    return this.http.post<Paiement>(`${this.api}/paiements/`, data);
  }

  // Contrats
  getContrats(): Observable<Contrat[]> {
    return this.http.get<PaginatedResponse<Contrat> | Contrat[]>(`${this.api}/contrats/`)
      .pipe(map(d => unwrapPaginated(d)));
  }
  createContrat(data: Partial<Contrat>): Observable<Contrat> {
    return this.http.post<Contrat>(`${this.api}/contrats/`, data);
  }
  updateContrat(id: number, data: Partial<Contrat>): Observable<Contrat> {
    return this.http.patch<Contrat>(`${this.api}/contrats/${id}/`, data);
  }
  cloturerContrat(id: number, data: any): Observable<Contrat> {
    return this.http.post<Contrat>(`${this.api}/contrats/${id}/cloturer/`, data);
  }
  genererPdfContrat(id: number): Observable<Contrat> {
    return this.http.post<Contrat>(`${this.api}/contrats/${id}/generer-pdf/`, {});
  }

  // Maintenance
  getMaintenances(): Observable<MaintenanceItem[]> {
    return this.http.get<PaginatedResponse<MaintenanceItem> | MaintenanceItem[]>(`${this.api}/maintenances/`)
      .pipe(map(d => unwrapPaginated(d)));
  }
  createMaintenance(data: Partial<MaintenanceItem>): Observable<MaintenanceItem> {
    return this.http.post<MaintenanceItem>(`${this.api}/maintenances/`, data);
  }
  deleteMaintenance(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/maintenances/${id}/`);
  }
}
