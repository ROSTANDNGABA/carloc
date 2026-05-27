import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { expand, map, reduce } from 'rxjs/operators';
import { Vehicule } from '../../models/vehicule.model';
import { environment } from '../../../environments/environment';
import { PaginatedResponse, unwrapPaginated } from '../utils/api.util';

@Injectable({
  providedIn: 'root'
})
export class VehiculeService {
  private apiUrl = `${environment.apiUrl}/vehicules/`;

  constructor(private http: HttpClient) { }

  getVehicules(page = 1, search = ''): Observable<PaginatedResponse<Vehicule>> {
    let params = new HttpParams().set('page', String(page));
    if (search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<PaginatedResponse<Vehicule>>(this.apiUrl, { params });
  }

  getAllVehicules(): Observable<Vehicule[]> {
    const fetchPage = (page: number): Observable<PaginatedResponse<Vehicule>> => this.getVehicules(page);
    return fetchPage(1).pipe(
      expand(response => response.next ? fetchPage(pageFromUrl(response.next)) : of()),
      reduce((acc, response) => [...acc, ...(response.results ?? [])], [] as Vehicule[])
    );
  }

  getVehiculeById(id: number): Observable<Vehicule> {
    return this.http.get<Vehicule>(`${this.apiUrl}${id}/`);
  }

  createVehicule(vehicule: Partial<Vehicule> | FormData): Observable<Vehicule> {
    return this.http.post<Vehicule>(this.apiUrl, vehicule);
  }

  updateVehicule(id: number, vehicule: Partial<Vehicule> | FormData): Observable<Vehicule> {
    return this.http.patch<Vehicule>(`${this.apiUrl}${id}/`, vehicule);
  }

  deleteVehicule(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`);
  }

  verifierDisponibilite(id: number, dateDebut: string, dateFin: string): Observable<{ disponible: boolean; message: string }> {
    return this.http.get<{ disponible: boolean; message: string }>(
      `${this.apiUrl}${id}/disponibilite/`,
      { params: { date_debut: dateDebut, date_fin: dateFin } }
    );
  }
}

function pageFromUrl(url: string): number {
  const params = new URLSearchParams(url.split('?')[1]);
  return parseInt(params.get('page') || '1', 10);
}
