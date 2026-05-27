import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Client } from '../../models/client.model';
import { environment } from '../../../environments/environment';
import { PaginatedResponse, unwrapPaginated } from '../utils/api.util';

export interface ClientHistorique {
  client: { id: number; nom: string; prenom: string; email: string };
  resume: {
    nb_reservations: number;
    nb_paiements: number;
    total_depense: string | number;
    solde_impaye: string | number;
  };
  reservations: Array<{
    id: number;
    vehicule: string;
    date_debut: string;
    date_fin: string;
    montant_du: string | number;
    solde_restant: string | number;
    est_annulee: boolean;
  }>;
  paiements: Array<{
    id: number;
    montant_paye: string | number;
    mode_paiement: string;
    date_paiement: string;
  }>;
  factures: Array<{
    id: number;
    numero: string;
    montant_total: string | number;
    statut: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private apiUrl = `${environment.apiUrl}/clients/`;

  constructor(private http: HttpClient) { }

  getMe(): Observable<Client> {
    return this.http.get<Client>(`${this.apiUrl}me/`);
  }

  getHistorique(clientId: number): Observable<ClientHistorique> {
    return this.http.get<ClientHistorique>(`${this.apiUrl}${clientId}/historique/`);
  }

  getClients(page = 1, search = ''): Observable<PaginatedResponse<Client>> {
    let params = new HttpParams().set('page', String(page));
    if (search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<PaginatedResponse<Client>>(this.apiUrl, { params });
  }

  /** Charge toutes les pages (catalogue public, sélecteurs). */
  getAllClients(): Observable<Client[]> {
    return this.getClients(1).pipe(
      map(response => response.results ?? []),
    );
  }

  createClient(client: Record<string, unknown>): Observable<Client> {
    return this.http.post<Client>(this.apiUrl, client);
  }

  updateClient(id: number, client: Partial<Client> | FormData): Observable<Client> {
    return this.http.patch<Client>(`${this.apiUrl}${id}/`, client);
  }
}
