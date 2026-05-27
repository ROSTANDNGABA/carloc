import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { AdminService, Gestionnaire } from '@app/core/services/admin.service';
import { extractApiError } from '@app/core/utils/api.util';
import { money, shortDate } from '@app/shared/formatters';

interface HistoryRow {
  id: number;
  manager: string;
  client: string;
  vehicule: string;
  date_debut: string;
  date_fin: string;
  montant_total: number;
  total_paye: number;
  est_annulee: boolean;
}

@Component({
  selector: 'app-super-admin-history-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="history-page">
      <div class="history-head">
        <div>
          <p>Audit locations</p>
          <h2>Historique des locations réalisées</h2>
        </div>
        <button type="button" (click)="load()">
          <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
          Actualiser
        </button>
      </div>

      @if (error()) {
        <div class="history-alert">{{ error() }}</div>
      }

      <div class="history-table">
        <table>
          <thead>
            <tr>
              <th>Gestionnaire</th>
              <th>Client</th>
              <th>Véhicule</th>
              <th>Période</th>
              <th>Montant payé</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr><td colspan="6">Chargement...</td></tr>
            } @else {
              @for (row of rows(); track row.manager + '-' + row.id) {
                <tr>
                  <td><strong>{{ row.manager }}</strong></td>
                  <td>{{ row.client }}</td>
                  <td>{{ row.vehicule }}</td>
                  <td>{{ dateFmt(row.date_debut) }} - {{ dateFmt(row.date_fin) }}</td>
                  <td>{{ moneyFmt(row.total_paye || row.montant_total) }}</td>
                  <td>
                    <span [class]="row.est_annulee ? 'pill danger' : 'pill success'">
                      {{ row.est_annulee ? 'Annulée' : 'Validée' }}
                    </span>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="6">Aucun historique disponible.</td></tr>
              }
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: [`
    .history-page {
      display: grid;
      gap: 1rem;
    }
    .history-head,
    .history-table {
      border: 1px solid #dbe4ef;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
    }
    .history-head {
      padding: 1.1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    .history-head p,
    .history-head h2 {
      margin: 0;
    }
    .history-head p {
      color: #1646a3;
      font-size: 0.74rem;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .history-head h2 {
      margin-top: 0.2rem;
      color: #0f172a;
      font-size: 1.15rem;
      font-weight: 950;
    }
    .history-head button {
      min-height: 2.55rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.5rem 0.9rem;
      border: 1px solid #c9d9f5;
      border-radius: 8px;
      background: #eef4ff;
      color: #1646a3;
      font-weight: 900;
    }
    .history-alert {
      padding: 0.9rem 1rem;
      border-radius: 8px;
      border: 1px solid #fecaca;
      background: #fff3f2;
      color: #b42318;
      font-weight: 800;
    }
    .history-table {
      overflow: auto;
    }
    table {
      width: 100%;
      min-width: 56rem;
      border-collapse: collapse;
    }
    th,
    td {
      padding: 0.85rem 0.9rem;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
    }
    th {
      background: #f8fafc;
      color: #64748b;
      font-size: 0.72rem;
      font-weight: 950;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    td {
      color: #243244;
    }
    tbody tr:hover {
      background: #f8fafc;
    }
    .pill {
      display: inline-flex;
      padding: 0.38rem 0.7rem;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 900;
    }
    .pill.success {
      color: #166534;
      background: #ecfdf3;
      border: 1px solid #bbf7d0;
    }
    .pill.danger {
      color: #b42318;
      background: #fff3f2;
      border: 1px solid #fecaca;
    }
    @media (max-width: 720px) {
      .history-head {
        align-items: flex-start;
        flex-direction: column;
      }
      .history-head button {
        width: 100%;
      }
    }
  `],
})
export class SuperAdminHistoryPageComponent {
  private readonly admin = inject(AdminService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly rows = signal<HistoryRow[]>([]);
  readonly moneyFmt = money;
  readonly dateFmt = shortDate;

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    this.admin
      .getGestionnairesStats()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: managers => this.rows.set(this.toRows(managers)),
        error: err => this.error.set(extractApiError(err)),
      });
  }

  private toRows(managers: Gestionnaire[]): HistoryRow[] {
    return managers
      .flatMap(manager =>
        (manager.historique_locations ?? []).map(location => ({
          ...location,
          manager: this.managerName(manager),
        })),
      )
      .sort((a, b) => b.id - a.id);
  }

  private managerName(manager: Gestionnaire): string {
    const name = `${manager.first_name ?? ''} ${manager.last_name ?? ''}`.trim();
    return name || manager.username;
  }
}
