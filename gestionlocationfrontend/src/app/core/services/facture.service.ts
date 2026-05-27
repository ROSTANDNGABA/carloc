import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Facture } from '../../models/facture.model';
import { PaginatedResponse, unwrapPaginated } from '../utils/api.util';

@Injectable({
  providedIn: 'root'
})
export class FactureService {
  private apiUrl = `${environment.apiUrl}/factures/`;

  constructor(private http: HttpClient) {}

  getFactures(): Observable<Facture[]> {
    return this.http
      .get<PaginatedResponse<Facture> | Facture[]>(this.apiUrl)
      .pipe(map(data => unwrapPaginated(data)));
  }

  getFacture(id: number): Observable<Facture> {
    return this.http.get<Facture>(`${this.apiUrl}${id}/`);
  }

  genererPdf(id: number): Observable<Facture> {
    return this.http.post<Facture>(`${this.apiUrl}${id}/generer-pdf/`, {});
  }

  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}${id}/telecharger-pdf/`, { responseType: 'blob' });
  }

  getPdfUrl(facture: Facture): string | null {
    if (facture.fichier_pdf_url) {
      return facture.fichier_pdf_url;
    }
    return `${environment.apiUrl}/factures/${facture.id}/telecharger-pdf/`;
  }
}
