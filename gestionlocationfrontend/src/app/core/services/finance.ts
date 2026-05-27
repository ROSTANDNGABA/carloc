import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  DashboardApiResponse,
  DashboardViewModel,
  ReservationRow,
  VehiculeRentableRow,
} from '../../models/dashboard.model';
import { Reservation } from '../../models/reservation.model';
import { PaginatedResponse, unwrapPaginated } from '../utils/api.util';

@Injectable({
  providedIn: 'root'
})
export class FinanceService {
  private baseApiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getDashboardStats(dateDebut?: string, dateFin?: string): Observable<DashboardViewModel> {
    const params: Record<string, string> = {};
    if (dateDebut) params['date_debut'] = dateDebut;
    if (dateFin) params['date_fin'] = dateFin;

    return forkJoin({
      dashboard: this.http.get<DashboardApiResponse>(`${this.baseApiUrl}/dashboard/`, { params }),
      reservations: this.http.get<PaginatedResponse<Reservation> | Reservation[]>(
        `${this.baseApiUrl}/reservations/`
      ),
    }).pipe(
      map(({ dashboard, reservations }) => {
        const list = unwrapPaginated(reservations) as ReservationRow[];
        const vehiculesPlusRentables: VehiculeRentableRow[] = dashboard.vehicules_plus_rentables ?? [];
        return {
          chiffreAffaires: Number(dashboard.chiffre_affaires_total),
          chiffreAffairesMois: Number(dashboard.chiffre_affaires_mois),
          chiffreAffairesPeriode: Number(dashboard.chiffre_affaires_periode),
          tauxOccupation: dashboard.taux_occupation,
          totalClients: Number(
            dashboard.total_clients ?? dashboard.statistiques_clients?.total_clients ?? 0,
          ),
          totalVehicules: dashboard.total_vehicules,
          vehiculesLoues: dashboard.vehicules_loues,
          enMaintenance: dashboard.vehicules_en_maintenance,
          disponibles: dashboard.vehicules_disponibles,
          reservationsActives: dashboard.reservations_actives,
          reservationsImpayees: dashboard.reservations_impayees,
          recentBookings: [...list].sort((a, b) => b.id - a.id).slice(0, 5),
          vehiculesPlusRentables,
        };
      })
    );
  }
}
