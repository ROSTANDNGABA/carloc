import { CommonModule } from '@angular/common';
import { Component, inject, signal, computed } from '@angular/core';
import { finalize, switchMap } from 'rxjs';
import { FactureService } from '@app/core/services/facture.service';
import { extractApiError } from '@app/core/utils/api.util';
import { Facture } from '@app/models/facture.model';
import { money, shortDate } from '@app/shared/formatters';

@Component({
  selector: 'app-invoices-page',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="lux-page">
  <div class="page-header">
    <div class="header-left">
      <h2>Mes Factures</h2>
      <p>Consultez l'historique de vos paiements et téléchargez vos factures.</p>
    </div>
  </div>
  
  @if (loading()) {
    <div class="lux-skeleton-grid">
      @for (i of [1,2,3]; track i) {
        <div class="lux-skeleton-card" style="height: 100px;"></div>
      }
    </div>
  } @else {
    <div class="lux-metric-grid mb-4">
      <div class="lux-metric-card">
        <div class="metric-info">
          <span class="metric-label">Total Payé</span>
          <strong class="metric-value">{{ totalAmountLabel() }}</strong>
        </div>
      </div>
      <div class="lux-metric-card">
        <div class="metric-info">
          <span class="metric-label">Factures Payées</span>
          <strong class="metric-value">{{ paidCount() }}</strong>
        </div>
      </div>
      <div class="lux-metric-card">
        <div class="metric-info">
          <span class="metric-label">En Attente</span>
          <strong class="metric-value">{{ pendingCount() }}</strong>
        </div>
      </div>
    </div>
    
    <div class="lux-panel">
      <div class="panel-body">
        @if (factures().length) {
          <table class="lux-table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Date</th>
                <th>Réservation</th>
                <th>Statut</th>
                <th>Montant</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              @for (fac of factures(); track fac.id) {
                <tr>
                  <td><strong>FAC-{{ fac.id }}</strong></td>
                  <td>{{ dateFmt(fac.date_emission) }}</td>
                  <td>RES-{{ fac.reservation }}</td>
                  <td><span class="status-badge" [class]="fac.statut">{{ fac.statut }}</span></td>
                  <td><strong>{{ moneyFmt(fac.montant_total) }}</strong></td>
                  <td>
                    @if (fac.statut !== 'payee') {
                      <button class="lux-btn lux-btn-primary btn-small" (click)="download(fac)">Télécharger</button>
                    } @else {
                      <button class="lux-btn lux-btn-outline btn-small" (click)="download(fac)">Télécharger</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <div class="lux-empty-state">
            <i class="bi bi-receipt"></i>
            <h3>Aucune facture</h3>
            <p>Vous n'avez pas encore de factures dans votre historique.</p>
          </div>
        }
      </div>
    </div>
  }
</div>
  `,
  styles: [`
  .lux-page {
    animation: fadeIn 0.4s ease;
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
    box-sizing: border-box;
  }
  .lux-page *,
  .lux-page *::before,
  .lux-page *::after {
    box-sizing: border-box;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .page-header {
    margin-bottom: 2.5rem;
  }
  .page-header h2 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    overflow-wrap: anywhere;
  }
  .page-header p {
    color: var(--lux-text-muted);
    overflow-wrap: anywhere;
  }
  .mb-4 {
    margin-bottom: 2rem;
  }
  .lux-metric-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.5rem;
  }
  .lux-metric-card {
    background-color: var(--lux-surface);
    border: 1px solid var(--lux-border);
    border-radius: var(--lux-radius);
    padding: 1.5rem;
    box-shadow: var(--lux-shadow);
    min-width: 0;
  }
  .metric-info {
    display: flex;
    flex-direction: column;
  }
  .metric-label {
    font-size: 0.85rem;
    color: var(--lux-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }
  .metric-value {
    font-size: 1.8rem;
    font-weight: 800;
    color: var(--lux-accent);
    overflow-wrap: anywhere;
  }
  .lux-panel {
    background-color: var(--lux-surface);
    border: 1px solid var(--lux-border);
    border-radius: var(--lux-radius);
    overflow: hidden;
    max-width: 100%;
  }
  .panel-body {
    padding: 1.5rem;
    max-width: 100%;
  }
  .lux-table {
    width: 100%;
    border-collapse: collapse;
  }
  .lux-table th {
    text-align: left;
    color: var(--lux-text-muted);
    font-size: 0.85rem;
    text-transform: uppercase;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--lux-border);
  }
  .lux-table td {
    padding: 1rem 0;
    border-bottom: 1px solid var(--lux-border);
  }
  .lux-table tr:last-child td {
    border-bottom: none;
  }
  .status-badge {
    padding: 0.3rem 0.6rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: capitalize;
  }
  .status-badge.attente { background: rgba(255, 193, 7, 0.15); color: #ffc107; }
  .status-badge.payee { background: rgba(40, 167, 69, 0.15); color: #28a745; }
  .status-badge.impayee { background: rgba(220, 53, 69, 0.15); color: #dc3545; }
  .btn-small {
    padding: 0.4rem 1rem;
    font-size: 0.85rem;
  }
  .lux-empty-state {
    text-align: center;
    padding: 4rem;
    color: var(--lux-text-muted);
    max-width: 100%;
  }
  .lux-empty-state i {
    font-size: 3rem;
    margin-bottom: 1rem;
    display: block;
  }
  .lux-empty-state h3 {
    color: var(--lux-heading);
    margin-bottom: 0.5rem;
  }
  @media (max-width: 760px) {
    .page-header {
      margin-bottom: 1.5rem;
    }

    .page-header h2 {
      font-size: 1.65rem;
    }

    .lux-metric-grid {
      grid-template-columns: 1fr;
      gap: 0.85rem;
    }

    .lux-metric-card {
      padding: 1rem;
    }

    .metric-label {
      font-size: 0.74rem;
      letter-spacing: 0.04em;
    }

    .metric-value {
      font-size: 1.45rem;
    }

    .panel-body {
      padding: 1rem;
    }

    .lux-empty-state {
      padding: 3rem 1rem;
    }
  }

  @media (max-width: 420px) {
    .page-header h2 {
      font-size: 1.45rem;
    }

    .page-header p {
      font-size: 0.92rem;
    }
  }
  `]
})
export class InvoicesPageComponent {
  private readonly facturesService = inject(FactureService);

  readonly factures = signal<Facture[]>([]);
  readonly loading = signal(true);
  readonly working = signal<number | null>(null);
  readonly error = signal('');
  readonly message = signal('');

  readonly paidCount = computed(() => this.factures().filter(f => f.statut === 'payee').length);
  readonly pendingCount = computed(() => this.factures().filter(f => f.statut !== 'payee' && f.statut !== 'annulee').length);
  readonly totalAmountLabel = computed(() => {
    const factures = this.factures();
    const seen = new Set<number>();
    let total = 0;
    for (const f of factures) {
      if (!seen.has(f.reservation)) {
        seen.add(f.reservation);
        total += Number(f.reservation_total_paye || 0);
      }
    }
    return this.moneyFmt(total);
  });

  readonly moneyFmt = money;
  readonly dateFmt = shortDate;

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.facturesService
      .getFactures()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: factures => this.factures.set(factures),
        error: (err: unknown) => this.error.set(extractApiError(err)),
      });
  }

  download(facture: Facture): void {
    this.working.set(facture.id);
    this.error.set('');
    this.message.set('');

    const source = facture.fichier_pdf_url
      ? this.facturesService.downloadPdf(facture.id)
      : this.facturesService.genererPdf(facture.id).pipe(switchMap(updated => this.facturesService.downloadPdf(updated.id)));

    source.pipe(finalize(() => this.working.set(null))).subscribe({
      next: blob => {
        if (typeof window === 'undefined') return;
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => window.URL.revokeObjectURL(url), 10000);
        this.message.set('PDF ouvert dans un nouvel onglet.');
      },
      error: (err: unknown) => this.error.set(extractApiError(err)),
    });
  }
}
