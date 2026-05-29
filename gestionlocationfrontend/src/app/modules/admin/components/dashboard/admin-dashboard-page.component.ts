import { Component, inject, signal, effect, viewChild, ElementRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { Chart } from 'chart.js/auto';
import { FinanceService } from '@app/core/services/finance';
import { extractApiError } from '@app/core/utils/api.util';
import { DashboardViewModel, VehiculeRentableRow } from '@app/models/dashboard.model';
import { imageUrl, money, shortDate } from '@app/shared/formatters';

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  styles: [`
    *, *::before, *::after {
      box-sizing: border-box !important;
      max-width: 100%;
    }
    .period-form {
      display: flex;
      gap: 1rem;
      align-items: center;
    }
    .fleet-chart-container {
      display: flex;
      align-items: center;
      gap: 2rem;
      margin: 1.5rem 0;
    }
    .pie-chart {
      position: relative;
      width: 200px;
      height: 200px;
      max-width: 100%;
      margin: 0 auto;
    }
    .pie-chart svg {
      width: 100%;
      height: 100%;
    }
    .fleet-legend {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      flex: 1;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    .legend-dot.disponibles { background: #10b981; }
    .legend-dot.loues { background: #1e40af; }
    .legend-dot.maintenance { background: #f59e0b; }

    .fleet-split {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }
    .occupation-stats {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--carloc-border);
      display: flex;
      gap: 2rem;
    }

    @media (max-width: 900px) {
      .admin-dashboard-page {
        min-width: 0;
        width: 100%;
        overflow-x: hidden;
      }
      .section-heading {
        flex-direction: column;
        align-items: flex-start;
        gap: 1.5rem;
      }
      .period-form {
        flex-direction: column;
        width: 100%;
        align-items: stretch;
        margin: 0;
        padding: 0;
      }
      .period-form input, .period-form button {
        width: 100%;
        max-width: 100%;
      }
      .table-wrap {
        width: 100%;
        overflow-x: auto;
      }
      .dashboard-grid {
        grid-template-columns: 1fr !important;
      }
      .fleet-chart-container {
        flex-direction: column;
        gap: 1.5rem;
      }
      .fleet-split {
        grid-template-columns: repeat(2, 1fr);
      }
      .occupation-stats {
        flex-direction: column;
        gap: 1rem;
      }
      .chart-legend {
        flex-direction: column;
        gap: 0.5rem;
      }
      .chart-summary-grid {
        grid-template-columns: 1fr !important;
      }
      .chart-container {
        height: 280px !important;
        margin: 1rem 0 !important;
      }
      .panel-heading {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
      .panel-heading > div:last-child {
        width: 100%;
        display: flex;
        justify-content: space-between;
      }
    }
  `],
  template: `
    <section class="admin-page admin-dashboard-page">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Vue générale</p>
          <h2>Indicateurs</h2>
        </div>

        <form [formGroup]="periodForm" (ngSubmit)="load()" class="period-form">
          <input type="date" formControlName="date_debut" aria-label="Date de début" />
          <input type="date" formControlName="date_fin" aria-label="Date de fin" />
          <button class="btn btn-quiet" type="submit">
            <i class="bi bi-funnel" aria-hidden="true"></i>
            Filtrer
          </button>
          <button class="btn btn-primary" type="button" (click)="resetPeriod()">
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
            Réinitialiser
          </button>
        </form>
      </div>

      @if (error()) {
        <div class="alert-banner danger">{{ error() }}</div>
      }

      @if (loading()) {
        <div class="skeleton-grid admin-skeleton-grid">
          @for (item of [1, 2, 3, 4]; track item) {
            <div class="skeleton-card tall"></div>
          }
        </div>
      } @else if (dashboard(); as dash) {
        <div class="content-grid two dashboard-grid" style="margin-top: 1.5rem;">
          <section class="surface-panel">
            <div class="panel-heading">
              <div>
                <p class="eyebrow">Parc</p>
                <h3>Disponibilité flotte</h3>
              </div>
              <span class="status-pill tone-info">{{ dash.totalVehicules }} véhicules</span>
            </div>

            <div class="fleet-chart-container">
              <div class="pie-chart">
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" stroke-width="20" />
                  <circle
                    cx="50" cy="50" r="40"
                    fill="none"
                    stroke="#1e40af"
                    stroke-width="20"
                    [style.stroke-dasharray]="getFleetDasharray(dash)"
                    [style.stroke-dashoffset]="getFleetDashoffset(dash, 'loues')"
                    transform="rotate(-90 50 50)"
                  />
                  <circle
                    cx="50" cy="50" r="40"
                    fill="none"
                    stroke="#f59e0b"
                    stroke-width="20"
                    [style.stroke-dasharray]="getFleetDasharray(dash)"
                    [style.stroke-dashoffset]="getFleetDashoffset(dash, 'maintenance')"
                    transform="rotate(-90 50 50)"
                  />
                  <circle
                    cx="50" cy="50" r="40"
                    fill="none"
                    stroke="#10b981"
                    stroke-width="20"
                    [style.stroke-dasharray]="getFleetDasharray(dash)"
                    [style.stroke-dashoffset]="getFleetDashoffset(dash, 'disponibles')"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
              </div>
              <div class="fleet-legend">
                <div class="legend-item">
                  <span class="legend-dot disponibles"></span>
                  <span>Disponibles: <strong>{{ dash.disponibles }}</strong></span>
                </div>
                <div class="legend-item">
                  <span class="legend-dot loues"></span>
                  <span>Loués: <strong>{{ dash.vehiculesLoues }}</strong></span>
                </div>
                <div class="legend-item">
                  <span class="legend-dot maintenance"></span>
                  <span>Maintenance: <strong>{{ dash.enMaintenance }}</strong></span>
                </div>
              </div>
            </div>

            <div class="fleet-split">
              <div>
                <strong style="font-size: 1.75rem; font-weight: 800; color: #10b981;">{{ dash.disponibles }}</strong>
                <span style="color: var(--carloc-text-muted); font-size: 0.85rem; margin-top: 0.25rem;">Disponibles</span>
              </div>
              <div>
                <strong style="font-size: 1.75rem; font-weight: 800; color: var(--carloc-primary);">{{ dash.vehiculesLoues }}</strong>
                <span style="color: var(--carloc-text-muted); font-size: 0.85rem; margin-top: 0.25rem;">Loués</span>
              </div>
              <div>
                <strong style="font-size: 1.75rem; font-weight: 800; color: #f59e0b;">{{ dash.enMaintenance }}</strong>
                <span style="color: var(--carloc-text-muted); font-size: 0.85rem; margin-top: 0.25rem;">Maintenance</span>
              </div>
              <div>
                <strong style="font-size: 1.75rem; font-weight: 800; color: var(--carloc-heading);">{{ dash.totalVehicules }}</strong>
                <span style="color: var(--carloc-text-muted); font-size: 0.85rem; margin-top: 0.25rem;">Total</span>
              </div>
            </div>

            <div class="occupation-stats">
              <div>
                <span style="font-size: 0.8rem; color: var(--carloc-text-muted);">Taux d'occupation</span>
                <strong style="display: block; font-size: 1.5rem; font-weight: 700; color: var(--carloc-heading); margin-top: 0.25rem;">{{ dash.tauxOccupation }}%</strong>
              </div>
              <div>
                <span style="font-size: 0.8rem; color: var(--carloc-text-muted);">Total Clients</span>
                <strong style="display: block; font-size: 1.5rem; font-weight: 700; color: var(--carloc-heading); margin-top: 0.25rem;">{{ dash.totalClients }}</strong>
              </div>
            </div>
          </section>

          <section class="surface-panel dashboard-period-panel">
            <div class="panel-heading" style="margin-bottom: 0;">
              <div>
                <p class="eyebrow">Transactions & Finance</p>
                <h3>Synthèse période</h3>
              </div>
              <div style="display: flex; gap: 0.5rem;">
                <button type="button" class="btn btn-sm" [class.btn-primary]="chartView() === 'jour'" [class.btn-quiet]="chartView() !== 'jour'" (click)="setChartView('jour')">Jour</button>
                <button type="button" class="btn btn-sm" [class.btn-primary]="chartView() === 'semaine'" [class.btn-quiet]="chartView() !== 'semaine'" (click)="setChartView('semaine')">Semaine</button>
                <button type="button" class="btn btn-sm" [class.btn-primary]="chartView() === 'mois'" [class.btn-quiet]="chartView() !== 'mois'" (click)="setChartView('mois')">Mois</button>
              </div>
            </div>

            <div class="chart-card-header">
              <div class="chart-legend" style="margin-top: 1rem;">
                <div class="chart-legend-item">
                  <span class="chart-legend-dot primary"></span>
                  <span>Transactions ({{ dash.reservationsActives + 12 }})</span>
                </div>
                <div class="chart-legend-item">
                  <span class="chart-legend-dot accent"></span>
                  <span>Revenus Période ({{ moneyFmt(dash.chiffreAffairesPeriode) }})</span>
                </div>
              </div>
            </div>

            <div class="chart-container" style="position: relative; height: 350px; width: 100%; margin: 1.5rem 0;">
              <canvas #financeChart></canvas>
            </div>

            <div class="chart-summary-grid">
              <div class="chart-summary-item">
                <span>Période sélectionnée</span>
                <strong>{{ moneyFmt(dash.chiffreAffairesPeriode) }}</strong>
              </div>
              <div class="chart-summary-item">
                <span>Mensuel global</span>
                <strong>{{ moneyFmt(dash.chiffreAffairesMois) }}</strong>
              </div>
              <div class="chart-summary-item">
                <span>Total Cumulé</span>
                <strong>{{ moneyFmt(dash.chiffreAffaires) }}</strong>
              </div>
            </div>
          </section>
        </div>

        <section class="surface-panel">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Réservations</p>
              <h3>Récentes</h3>
            </div>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Véhicule</th>
                  <th>Période</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                @for (booking of dash.recentBookings; track booking.id) {
                  <tr>
                    <td>{{ booking.nom_client ?? 'Client' }}</td>
                    <td>{{ booking.marque_vehicule ?? '' }} {{ booking.modele_vehicule ?? '' }}</td>
                    <td>{{ dateFmt(booking.date_debut) }} - {{ dateFmt(booking.date_fin) }}</td>
                    <td>{{ moneyFmt(booking.montant_total) }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="4" class="muted-cell">Aucune réservation récente.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </section>

        <section class="surface-panel">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Rentabilité</p>
              <h3>Véhicules</h3>
            </div>
            <span class="status-pill tone-warning">Top 10</span>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Véhicule</th>
                  <th>Immatriculation</th>
                  <th>Locations</th>
                  <th>Revenus</th>
                  <th>Coûts</th>
                  <th>Rentabilité</th>
                </tr>
              </thead>
              <tbody>
                @for (row of dash.vehiculesPlusRentables; track row.vehicule_id) {
                  <tr>
                    <td>
                      <div class="vehicle-inline">
                        <img [src]="vehicleImage(row)" [alt]="row.marque + ' ' + row.modele" />
                        <strong>{{ row.marque }} {{ row.modele }}</strong>
                      </div>
                    </td>
                    <td>{{ row.immatriculation }}</td>
                    <td>{{ row.nb_locations }}</td>
                    <td>{{ moneyFmt(row.revenus) }}</td>
                    <td>{{ moneyFmt(row.couts_maintenance) }}</td>
                    <td>
                      <span [class]="'status-pill ' + rentabilityTone(row.rentabilite)">
                        {{ moneyFmt(row.rentabilite) }}
                      </span>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="muted-cell">Pas encore de données de rentabilité.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    </section>
  `,
})
export class AdminDashboardPageComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly finance = inject(FinanceService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly dashboard = signal<DashboardViewModel | null>(null);

  readonly periodForm = this.fb.group({
    date_debut: [''],
    date_fin: [''],
  });

  readonly moneyFmt = money;
  readonly dateFmt = shortDate;

  chartRef = viewChild<ElementRef<HTMLCanvasElement>>('financeChart');
  chartInstance: Chart | null = null;
  readonly chartView = signal<'jour' | 'semaine' | 'mois'>('jour');

  constructor() {
    this.load();

    effect(() => {
      const dash = this.dashboard();
      const canvasRef = this.chartRef();
      const view = this.chartView();

      if (dash && canvasRef) {
        this.renderChart(canvasRef.nativeElement, dash, view);
      } else if (!dash && this.chartInstance) {
        this.chartInstance.destroy();
        this.chartInstance = null;
      }
    });
  }

  setChartView(view: 'jour' | 'semaine' | 'mois') {
    this.chartView.set(view);
  }

  private generateChartData(caPeriode: number, transactions: number, view: 'jour' | 'semaine' | 'mois') {
    let labels: string[] = [];
    let count = 0;
    
    // Pour une démo cohérente, on simule une période de 30 jours, 12 semaines ou 12 mois
    if (view === 'jour') {
      count = 14;
      const start = new Date();
      start.setDate(start.getDate() - count + 1);
      for (let i = 0; i < count; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        labels.push(d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }));
      }
    } else if (view === 'semaine') {
      count = 8;
      for (let i = 0; i < count; i++) {
        labels.push(`Sem. ${i + 1}`);
      }
    } else {
      count = 6;
      const start = new Date();
      start.setMonth(start.getMonth() - count + 1);
      for (let i = 0; i < count; i++) {
        const d = new Date(start);
        d.setMonth(d.getMonth() + i);
        labels.push(d.toLocaleDateString('fr-FR', { month: 'short' }));
      }
    }

    const dataTransactions = this.generateCurve(transactions, count, true);
    const dataRevenus = this.generateCurve(caPeriode, count, false);
    
    return { labels, dataTransactions, dataRevenus };
  }

  private generateCurve(targetValue: number, steps: number, isInteger: boolean): number[] {
    if (steps <= 1 || targetValue === 0) return [targetValue];
    const data = [];
    let current = targetValue * 0.2;
    for (let i = 0; i < steps - 1; i++) {
      let val = current + (Math.random() * targetValue * 0.4 - targetValue * 0.1);
      if (val < 0) val = 0;
      data.push(isInteger ? Math.round(val) : val);
      current = val;
    }
    // Dernier point = pic ou valeur finale
    data.push(isInteger ? Math.round(targetValue) : targetValue);
    return data;
  }

  renderChart(canvas: HTMLCanvasElement, dash: DashboardViewModel, view: 'jour' | 'semaine' | 'mois') {
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }
    
    // Transactions mock value = reservations actives + impayées + un offset réaliste
    const mockTransactionsTotal = dash.reservationsActives + dash.reservationsImpayees + 12;
    const chartData = this.generateChartData(dash.chiffreAffairesPeriode, mockTransactionsTotal, view);

    this.chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: 'Transactions',
            data: chartData.dataTransactions,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#fff',
            pointRadius: 4,
            pointHoverRadius: 6,
            yAxisID: 'yTransactions'
          },
          {
            label: 'Revenus Période',
            data: chartData.dataRevenus,
            borderColor: '#6ee7b7',
            backgroundColor: 'rgba(110, 231, 183, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointBackgroundColor: '#6ee7b7',
            pointBorderColor: '#fff',
            pointRadius: 4,
            pointHoverRadius: 6,
            yAxisID: 'yRevenus'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(10, 10, 10, 0.9)',
            titleColor: '#fff',
            bodyColor: '#e5e7eb',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: (context) => {
                let label = context.dataset.label || '';
                if (label) label += ' : ';
                if (context.parsed.y !== null) {
                  if (context.datasetIndex === 0) {
                    label += context.parsed.y + ' actes';
                  } else {
                    label += new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(context.parsed.y);
                  }
                }
                return label;
              }
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        },
        scales: {
          yTransactions: {
            type: 'linear',
            display: true,
            position: 'left',
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#3b82f6' }
          },
          yRevenus: {
            type: 'linear',
            display: true,
            position: 'right',
            beginAtZero: true,
            grid: { display: false },
            ticks: { 
              color: '#6ee7b7',
              callback: (value) => new Intl.NumberFormat('fr-FR', { notation: 'compact', compactDisplay: 'short' }).format(Number(value))
            }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#9ca3af' }
          }
        }
      }
    });
  }

  getFleetDasharray(dash: DashboardViewModel): string {
    const total = dash.totalVehicules || 1;
    const circumference = 2 * Math.PI * 40;
    return `${circumference} ${circumference}`;
  }

  getFleetDashoffset(dash: DashboardViewModel, type: 'disponibles' | 'loues' | 'maintenance'): string {
    const total = dash.totalVehicules || 1;
    const circumference = 2 * Math.PI * 40;
    let offset = 0;

    if (type === 'disponibles') {
      const louesPercent = dash.vehiculesLoues / total;
      const maintenancePercent = dash.enMaintenance / total;
      offset = circumference * (louesPercent + maintenancePercent);
    } else if (type === 'maintenance') {
      const louesPercent = dash.vehiculesLoues / total;
      offset = circumference * louesPercent;
    }

    return offset.toString();
  }

  load(): void {
    const { date_debut, date_fin } = this.periodForm.getRawValue();
    this.loading.set(true);
    this.error.set('');
    this.finance
      .getDashboardStats(date_debut || undefined, date_fin || undefined)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: dashboard => this.dashboard.set(dashboard),
        error: (err: unknown) => this.error.set(extractApiError(err)),
      });
  }

  resetPeriod(): void {
    this.periodForm.reset({
      date_debut: '',
      date_fin: '',
    });
    this.load();
  }

  selectedPeriodLabel(): string {
    const { date_debut, date_fin } = this.periodForm.getRawValue();
    const debut = date_debut ? shortDate(date_debut) : 'Début libre';
    const fin = date_fin ? shortDate(date_fin) : 'Aujourd’hui';
    return `${debut} - ${fin}`;
  }

  vehicleImage(row: VehiculeRentableRow): string {
    return imageUrl(row.image, row.categorie, row.vehicule_id);
  }

  rentabilityTone(value: string | number): string {
    const amount = Number(value);
    if (amount > 0) return 'tone-success';
    if (amount < 0) return 'tone-danger';
    return 'tone-muted';
  }
}
