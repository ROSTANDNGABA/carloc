import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { AuthService } from '@app/auth/auth.service';
import { ClientHistorique, ClientService } from '@app/core/services/client.service';
import { extractApiError } from '@app/core/utils/api.util';
import { Client } from '@app/models/client.model';
import { money, shortDate, statusLabel, statusTone } from '@app/shared/formatters';

@Component({
  selector: 'app-client-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="lux-dashboard">
  @if (loading()) {
    <div class="lux-skeleton-grid">
      @for (i of [1,2,3,4]; track i) {
        <div class="lux-skeleton-card"></div>
      }
    </div>
  } @else {
    <div class="dashboard-header">
      <h2>Bienvenue, {{ clientTitle() }}</h2>
      <p>Voici un résumé de votre activité de location avec CarLoc.</p>
    </div>
    
    <div class="lux-metric-grid">
      <div class="lux-metric-card">
        <div class="metric-icon"><i class="bi bi-car-front"></i></div>
        <div class="metric-info">
          <span class="metric-label">Réservations Actives</span>
          <strong class="metric-value">{{ history()?.resume?.nb_reservations || 0 }}</strong>
        </div>
      </div>
      <div class="lux-metric-card">
        <div class="metric-icon"><i class="bi bi-clock-history"></i></div>
        <div class="metric-info">
          <span class="metric-label">En attente</span>
          <strong class="metric-value">{{ history()?.resume?.solde_impaye || 0 }}</strong>
        </div>
      </div>
      <div class="lux-metric-card">
        <div class="metric-icon"><i class="bi bi-check-circle"></i></div>
        <div class="metric-info">
          <span class="metric-label">Total Réservations</span>
          <strong class="metric-value">{{ history()?.resume?.nb_paiements || 0 }}</strong>
        </div>
      </div>
      <div class="lux-metric-card highlight">
        <div class="metric-icon"><i class="bi bi-cash-coin"></i></div>
        <div class="metric-info">
          <span class="metric-label">Total Dépensé</span>
          <strong class="metric-value">{{ moneyFmt(history()?.resume?.total_depense || 0) }}</strong>
        </div>
      </div>
    </div>
    
    <div class="dashboard-sections">
      <section class="lux-panel">
        <div class="panel-header">
          <h3>Réservations Récentes</h3>
          <a routerLink="/client/reservations" class="lux-btn lux-btn-outline btn-small">Tout voir</a>
        </div>
        <div class="panel-body">
          @if (history()?.reservations?.length) {
            <table class="lux-table">
              <thead>
                <tr>
                  <th>Véhicule</th>
                  <th>Période</th>
                  <th>Statut</th>
                  <th>Montant</th>
                </tr>
              </thead>
              <tbody>
                @for (res of history()?.reservations; track res.id) {
                  <tr>
                    <td><strong>{{ res.vehicule }}</strong></td>
                    <td>{{ dateFmt(res.date_debut) }} - {{ dateFmt(res.date_fin) }}</td>
                    <td><span class="status-badge" [class.annulee]="res.est_annulee">{{ res.est_annulee ? 'Annulée' : 'Active' }}</span></td>
                    <td>{{ moneyFmt(res.montant_du) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <div class="lux-empty-state">
              <i class="bi bi-calendar-x"></i>
              <p>Vous n'avez aucune réservation récente.</p>
              <a routerLink="/catalogue" class="lux-btn lux-btn-primary">Réserver un véhicule</a>
            </div>
          }
        </div>
      </section>
      
      <section class="lux-panel">
        <div class="panel-header">
          <h3>Dernières Factures</h3>
          <a routerLink="/client/factures" class="lux-btn lux-btn-outline btn-small">Tout voir</a>
        </div>
        <div class="panel-body">
          @if (history()?.factures?.length) {
            <table class="lux-table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Date</th>
                  <th>Statut</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                @for (fac of history()?.factures; track fac.id) {
                  <tr>
                    <td><strong>{{ fac.numero }}</strong></td>
                    <td>—</td>
                    <td><span class="status-badge" [class]="fac.statut">{{ fac.statut }}</span></td>
                    <td>{{ moneyFmt(fac.montant_total) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <div class="lux-empty-state">
              <i class="bi bi-receipt"></i>
              <p>Aucune facture récente.</p>
            </div>
          }
        </div>
      </section>
    </div>
  }
</div>
  `,
  styles: [`
  .dashboard-header {
    margin-bottom: 2rem;
  }
  .dashboard-header h2 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }
  .dashboard-header p {
    color: var(--lux-text-muted);
  }
  .lux-metric-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
    margin-bottom: 3rem;
  }
  .lux-metric-card {
    background-color: var(--lux-surface);
    border: 1px solid var(--lux-border);
    border-radius: var(--lux-radius);
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1.5rem;
    box-shadow: var(--lux-shadow);
  }
  .lux-metric-card.highlight {
    border-color: var(--lux-accent);
    background: radial-gradient(circle at top right, rgba(212, 175, 55, 0.1) 0%, var(--lux-surface) 100%);
  }
  .metric-icon {
    width: 50px;
    height: 50px;
    border-radius: 12px;
    background-color: rgba(212, 175, 55, 0.1);
    color: var(--lux-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
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
    margin-bottom: 0.25rem;
  }
  .metric-value {
    font-size: 1.5rem;
    font-weight: 800;
  }
  .dashboard-sections {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }
  .lux-panel {
    background-color: var(--lux-surface);
    border: 1px solid var(--lux-border);
    border-radius: var(--lux-radius);
    overflow: hidden;
  }
  .panel-header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--lux-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .panel-header h3 {
    font-size: 1.2rem;
  }
  .btn-small {
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
  }
  .panel-body {
    padding: 1.5rem;
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
  .status-badge.confirmee, .status-badge.payee { background: rgba(40, 167, 69, 0.15); color: #28a745; }
  .status-badge.en_cours { background: rgba(23, 162, 184, 0.15); color: #17a2b8; }
  .status-badge.terminee { background: rgba(108, 117, 125, 0.15); color: #6c757d; }
  .status-badge.annulee, .status-badge.impayee { background: rgba(220, 53, 69, 0.15); color: #dc3545; }
  
  .lux-empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--lux-text-muted);
  }
  .lux-empty-state i {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    display: block;
  }
  .lux-empty-state p {
    margin-bottom: 1.5rem;
  }
  `],
})
export class ClientDashboardPageComponent {
  private readonly auth = inject(AuthService);
  private readonly clients = inject(ClientService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly client = signal<Client | null>(null);
  readonly history = signal<ClientHistorique | null>(null);

  readonly moneyFmt = money;
  readonly dateFmt = shortDate;
  readonly label = statusLabel;
  readonly tone = statusTone;

  constructor() {
    this.load();
  }

  clientTitle(): string {
    const client = this.client();
    if (client) return `${client.prenom} ${client.nom}`;
    const hist = this.history();
    if (hist) return `${hist.client.prenom} ${hist.client.nom}`;
    return '';
  }

  shortDateFromHistory(hist: ClientHistorique): string {
    const lastReservation = hist.reservations?.[0];
    return lastReservation ? shortDate(lastReservation.date_fin ?? lastReservation.date_debut) : '—';
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');
    const id = this.auth.getClientId();
    if (id) {
      this.loadHistory(id);
      return;
    }

    this.clients.getMe().subscribe({
      next: client => {
        this.client.set(client);
        if (client.id) {
          this.loadHistory(client.id);
        } else {
          this.loading.set(false);
        }
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(extractApiError(err));
      },
    });
  }

  private loadHistory(id: number): void {
    this.clients
      .getHistorique(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: history => this.history.set(history),
        error: (err: unknown) => this.error.set(extractApiError(err)),
      });
  }
}
