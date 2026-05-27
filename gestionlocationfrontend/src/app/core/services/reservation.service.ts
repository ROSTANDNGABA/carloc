import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { EMPTY, Observable } from 'rxjs';
import { expand, map, reduce } from 'rxjs/operators';
import { Reservation } from '../../models/reservation.model';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../utils/api.util';

export interface ReservationCreatePayload {
  vehicule: number;
  date_debut: string;
  date_fin: string;
  client?: number;
}

export interface ReservationCancellationResponse {
  message: string;
  reservation_id: number;
  montant_remboursé: number;
  montant_pénalité: number;
  taux_remboursement: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private apiUrl = `${environment.apiUrl}/reservations/`;

  constructor(private http: HttpClient) { }

  getReservations(page = 1, search = ''): Observable<PaginatedResponse<Reservation>> {
    let params = new HttpParams().set('page', String(page));
    if (search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<PaginatedResponse<Reservation>>(this.apiUrl, { params });
  }

  /** Liste complète (pagination API) — filtrée par le backend selon le rôle. */
  getMesReservations(): Observable<Reservation[]> {
    return this.fetchAllPages();
  }

  getAllReservations(): Observable<Reservation[]> {
    return this.fetchAllPages();
  }

  private fetchAllPages(): Observable<Reservation[]> {
    return this.getReservations(1).pipe(
      expand(res => (res.next ? this.getReservations(this.pageFromUrl(res.next)) : EMPTY)),
      map(res => res.results ?? []),
      reduce((acc, chunk) => acc.concat(chunk), [] as Reservation[]),
    );
  }

  private pageFromUrl(url: string): number {
    try {
      const page = new URL(url).searchParams.get('page');
      return page ? Number(page) : 1;
    } catch {
      return 1;
    }
  }

  getReservationById(id: number): Observable<Reservation> {
    return this.http.get<Reservation>(`${this.apiUrl}${id}/`);
  }

  createReservation(reservation: ReservationCreatePayload | Partial<Reservation>): Observable<Reservation> {
    return this.http.post<Reservation>(this.apiUrl, reservation);
  }

  updateReservation(id: number, reservation: Partial<Reservation>): Observable<Reservation> {
    return this.http.put<Reservation>(`${this.apiUrl}${id}/`, reservation);
  }

  annulerReservation(id: number): Observable<ReservationCancellationResponse> {
    return this.http.post<ReservationCancellationResponse>(`${this.apiUrl}${id}/annuler/`, {});
  }
}
