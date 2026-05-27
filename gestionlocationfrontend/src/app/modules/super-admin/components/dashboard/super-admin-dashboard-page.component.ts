import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { finalize, forkJoin } from 'rxjs';
import { AdminService, Gestionnaire } from '@app/core/services/admin.service';
import { FinanceService } from '@app/core/services/finance';
import { DashboardViewModel } from '@app/models/dashboard.model';
import { extractApiError } from '@app/core/utils/api.util';
import { money, shortDate } from '@app/shared/formatters';

@Component({
  selector: 'app-super-admin-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="super-page">
      @if (error()) {
        <div class="super-alert">{{ error() }}</div>
      }

      @if (loading()) {
        <div class="super-grid cards">
          @for (item of [1, 2, 3, 4]; track item) {
            <div class="super-card skeleton"></div>
          }
        </div>
      } @else {
        <div class="super-grid cards">
          <article class="super-card kpi primary">
            <span>Chiffre d'affaires total</span>
            <strong>{{ moneyFmt(dashboard()?.chiffreAffaires ?? 0) }}</strong>
            <small>Revenus cumulés CarLoc</small>
          </article>
          <article class="super-card kpi">
            <span>CA du mois</span>
            <strong>{{ moneyFmt(dashboard()?.chiffreAffairesMois ?? 0) }}</strong>
            <small>Période courante</small>
          </article>
          <article class="super-card kpi">
            <span>Gestionnaires</span>
            <strong>{{ gestionnaires().length }}</strong>
            <small>{{ activeManagers() }} comptes actifs</small>
          </article>
          <article class="super-card kpi">
            <span>Locations suivies</span>
            <strong>{{ totalLocations() }}</strong>
            <small>Historique attribué</small>
          </article>
        </div>

        <div class="super-grid main">
          <section class="super-card">
            <div class="card-head">
              <div>
                <p>Performance équipe</p>
                <h2>Chiffre d'affaires par gestionnaire</h2>
              </div>
            </div>

            <div class="manager-rank">
              @for (manager of sortedManagers(); track manager.id) {
                <div class="rank-row">
                  <div>
                    <strong>{{ managerName(manager) }}</strong>
                    <small>{{ manager.locations_realisees ?? 0 }} locations réalisées</small>
                  </div>
                  <div class="rank-bar">
                    <span [style.width.%]="managerPercent(manager)"></span>
                  </div>
                  <b>{{ moneyFmt(manager.chiffre_affaires ?? 0) }}</b>
                </div>
              } @empty {
                <p class="empty">Aucun gestionnaire créé.</p>
              }
            </div>
          </section>

          <section class="super-card">
            <div class="card-head">
              <div>
                <p>Société</p>
                <h2>Résumé parc et activité</h2>
              </div>
            </div>

            <dl class="company-summary">
              <div>
                <dt>Véhicules</dt>
                <dd>{{ dashboard()?.totalVehicules ?? 0 }}</dd>
              </div>
              <div>
                <dt>Loués</dt>
                <dd>{{ dashboard()?.vehiculesLoues ?? 0 }}</dd>
              </div>
              <div>
                <dt>Disponibles</dt>
                <dd>{{ dashboard()?.disponibles ?? 0 }}</dd>
              </div>
              <div>
                <dt>Taux occupation</dt>
                <dd>{{ dashboard()?.tauxOccupation ?? 0 }}%</dd>
              </div>
            </dl>
          </section>
        </div>

        <section class="super-card">
          <div class="card-head">
            <div>
              <p>Historique</p>
              <h2>Dernières locations réalisées</h2>
            </div>
          </div>

          <div class="history-list">
            @for (row of recentHistory(); track row.manager + '-' + row.id) {
              <div class="history-row">
                <div>
                  <strong>{{ row.client }}</strong>
                  <small>{{ row.vehicule }}</small>
                </div>
                <span>{{ row.manager }}</span>
                <span>{{ dateFmt(row.date_debut) }} - {{ dateFmt(row.date_fin) }}</span>
                <b>{{ moneyFmt(row.total_paye || row.montant_total) }}</b>
              </div>
            } @empty {
              <p class="empty">Aucune location attribuée pour le moment.</p>
            }
          </div>
        </section>
      }
    </section>
  `,
  styles: [`
    .super-page {
      display: grid;
      gap: 1rem;
    }
    .super-grid {
      display: grid;
      gap: 1rem;
    }
    .super-grid.cards {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .super-grid.main {
      grid-template-columns: minmax(0, 1.35fr) minmax(20rem, 0.65fr);
      align-items: start;
    }
    .super-card {
      border: 1px solid #dbe4ef;
      border-radius: 8px;
      background: #fff;
      padding: 1.1rem;
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
    }
    .super-card.kpi {
      min-height: 8rem;
      display: grid;
      align-content: start;
      gap: 0.35rem;
    }
    .super-card.kpi.primary {
      color: #fff;
      background: linear-gradient(135deg, #07111f, #1646a3);
      border-color: #1646a3;
    }
    .kpi span,
    .card-head p {
      color: #1646a3;
      font-size: 0.74rem;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .kpi.primary span,
    .kpi.primary small {
      color: #dbeafe;
    }
    .kpi strong {
      color: #0f172a;
      font-size: clamp(1.55rem, 2.2vw, 2.2rem);
      line-height: 1;
      font-weight: 950;
    }
    .kpi.primary strong {
      color: #fff;
    }
    .kpi small,
    .rank-row small,
    .history-row small,
    .empty {
      color: #64748b;
    }
    .card-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .card-head p,
    .card-head h2 {
      margin: 0;
    }
    .card-head h2 {
      margin-top: 0.2rem;
      color: #0f172a;
      font-size: 1.05rem;
      font-weight: 950;
    }
    .manager-rank,
    .history-list,
    .company-summary {
      display: grid;
      gap: 0.75rem;
    }
    .rank-row {
      display: grid;
      grid-template-columns: minmax(10rem, 0.85fr) minmax(8rem, 1fr) auto;
      align-items: center;
      gap: 0.8rem;
      padding: 0.8rem;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #f8fafc;
    }
    .rank-row strong,
    .history-row strong {
      display: block;
      color: #0f172a;
    }
    .rank-bar {
      height: 0.7rem;
      overflow: hidden;
      border-radius: 999px;
      background: #e2e8f0;
    }
    .rank-bar span {
      display: block;
      height: 100%;
      min-width: 0.35rem;
      border-radius: inherit;
      background: linear-gradient(90deg, #1646a3, #0f766e);
    }
    .company-summary {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin: 0;
    }
    .company-summary div {
      padding: 0.9rem;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #f8fafc;
    }
    .company-summary dt {
      color: #64748b;
      font-size: 0.76rem;
      font-weight: 900;
      text-transform: uppercase;
    }
    .company-summary dd {
      margin: 0.25rem 0 0;
      color: #0f172a;
      font-size: 1.45rem;
      font-weight: 950;
    }
    .history-row {
      display: grid;
      grid-template-columns: minmax(14rem, 1fr) minmax(8rem, 0.5fr) minmax(12rem, 0.7fr) auto;
      align-items: center;
      gap: 0.75rem;
      padding: 0.8rem;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #fff;
    }
    .history-row span {
      color: #475569;
      font-weight: 700;
    }
    .super-alert {
      padding: 0.9rem 1rem;
      border-radius: 8px;
      border: 1px solid #fecaca;
      background: #fff3f2;
      color: #b42318;
      font-weight: 800;
    }
    .skeleton {
      min-height: 8rem;
      background: linear-gradient(90deg, #f3f5f8 25%, #e8edf4 37%, #f3f5f8 63%);
      background-size: 400% 100%;
      animation: shimmer 1.4s ease infinite;
    }
    @media (max-width: 1100px) {
      .super-grid.cards {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .super-grid.main {
        grid-template-columns: 1fr;
      }
      .history-row,
      .rank-row {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 640px) {
      .super-grid.cards,
      .company-summary {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class SuperAdminDashboardPageComponent {
  private readonly finance = inject(FinanceService);
  private readonly admin = inject(AdminService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly dashboard = signal<DashboardViewModel | null>(null);
  readonly gestionnaires = signal<Gestionnaire[]>([]);
  readonly moneyFmt = money;
  readonly dateFmt = shortDate;

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    forkJoin({
      dashboard: this.finance.getDashboardStats(),
      gestionnaires: this.admin.getGestionnairesStats(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ dashboard, gestionnaires }) => {
          this.dashboard.set(dashboard);
          this.gestionnaires.set(gestionnaires);
        },
        error: err => this.error.set(extractApiError(err)),
      });
  }

  activeManagers(): number {
    return this.gestionnaires().filter(manager => manager.is_active).length;
  }

  totalLocations(): number {
    return this.gestionnaires().reduce((total, manager) => total + (manager.locations_realisees ?? 0), 0);
  }

  sortedManagers(): Gestionnaire[] {
    return [...this.gestionnaires()].sort(
      (a, b) => (b.chiffre_affaires ?? 0) - (a.chiffre_affaires ?? 0),
    );
  }

  managerPercent(manager: Gestionnaire): number {
    const max = Math.max(...this.gestionnaires().map(item => item.chiffre_affaires ?? 0), 1);
    return Math.max(4, ((manager.chiffre_affaires ?? 0) / max) * 100);
  }

  managerName(manager: Gestionnaire): string {
    const name = `${manager.first_name ?? ''} ${manager.last_name ?? ''}`.trim();
    return name || manager.username;
  }

  recentHistory(): Array<{
    id: number;
    manager: string;
    client: string;
    vehicule: string;
    date_debut: string;
    date_fin: string;
    montant_total: number;
    total_paye: number;
  }> {
    return this.gestionnaires()
      .flatMap(manager =>
        (manager.historique_locations ?? []).map(location => ({
          ...location,
          manager: this.managerName(manager),
        })),
      )
      .sort((a, b) => b.id - a.id)
      .slice(0, 8);
  }
}
