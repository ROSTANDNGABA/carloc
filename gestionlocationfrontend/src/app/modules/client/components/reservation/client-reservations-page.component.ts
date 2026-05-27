import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ReservationService, ReservationCancellationResponse } from '@app/core/services/reservation.service';
import { extractApiError } from '@app/core/utils/api.util';
import { Reservation } from '@app/models/reservation.model';
import {
  canCancelReservation,
  money,
  reservationStatusLabel,
  reservationStatusTone,
  shortDate,
} from '@app/shared/formatters';

@Component({
  selector: 'app-client-reservations-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="lux-page">
  <div class="page-header">
    <div class="header-left">
      <h2>Mes réservations</h2>
      <p>Suivez vos locations, montants et annulations.</p>
    </div>
    <a routerLink="/catalogue" class="lux-btn lux-btn-primary">Nouvelle réservation</a>
  </div>

  @if (error()) {
    <div class="lux-alert lux-alert-error">{{ error() }}</div>
  }
  @if (message()) {
    <div class="lux-alert lux-alert-success">{{ message() }}</div>
  }

  @if (loading()) {
    <div class="lux-skeleton-grid">
      @for (i of [1, 2, 3]; track i) {
        <div class="lux-skeleton-card" style="height: 150px;"></div>
      }
    </div>
  } @else {
    <div class="reservations-list">
      @for (res of reservations(); track res.id) {
        <article class="lux-reservation-card">
          <div class="res-details">
            <div class="res-header">
              <span class="status-badge" [ngClass]="statusTone(res)">{{ statusLabel(res) }}</span>
              <h3>{{ vehicleLabel(res) }}</h3>
              <p class="plate">{{ res.immatriculation || '—' }}</p>
            </div>
            <div class="res-body">
              <div class="res-info-item">
                <i class="bi bi-calendar" aria-hidden="true"></i>
                <div>
                  <span class="label">Période</span>
                  <span class="value">{{ dateFmt(res.date_debut) }} → {{ dateFmt(res.date_fin) }}</span>
                </div>
              </div>
              <div class="res-info-item">
                <i class="bi bi-clock" aria-hidden="true"></i>
                <div>
                  <span class="label">Durée</span>
                  <span class="value">{{ res.nb_jours ?? '—' }} jour(s)</span>
                </div>
              </div>
              <div class="res-info-item">
                <i class="bi bi-cash-coin" aria-hidden="true"></i>
                <div>
                  <span class="label">Montant / solde</span>
                  <span class="value">{{ moneyFmt(res.montant_total) }} · reste {{ moneyFmt(res.solde_restant) }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="res-actions">
            @if (res.contrat_id) {
              <span class="meta">Contrat #{{ res.contrat_id }}</span>
            }
            @if (canCancel(res)) {
              <button
                class="lux-btn lux-btn-outline"
                type="button"
                [disabled]="cancellingId() === res.id"
                (click)="cancel(res)"
              >
                {{ cancellingId() === res.id ? 'Annulation…' : 'Annuler' }}
              </button>
            }
          </div>
        </article>
      } @empty {
        <div class="lux-empty-state">
          <i class="bi bi-calendar-x" aria-hidden="true"></i>
          <h3>Aucune réservation</h3>
          <p>Parcourez le catalogue pour réserver votre premier véhicule.</p>
          <a routerLink="/catalogue" class="lux-btn lux-btn-primary">Réserver maintenant</a>
        </div>
      }
    </div>
  }
</div>
  `,
  styles: [`
  .lux-page { animation: fadeIn 0.4s ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .page-header {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 2rem;
  }
  .page-header h2 { font-size: 2rem; margin-bottom: 0.5rem; }
  .page-header p { color: var(--lux-text-muted); margin: 0; }
  .reservations-list { display: flex; flex-direction: column; gap: 1.25rem; }
  .lux-reservation-card {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    background: var(--lux-surface);
    border: 1px solid var(--lux-border);
    border-radius: var(--lux-radius);
    padding: 1.5rem;
    box-shadow: var(--lux-shadow);
  }
  .res-details { flex: 1; min-width: 260px; }
  .res-header h3 { margin: 0.35rem 0 0; font-size: 1.35rem; }
  .plate { color: var(--lux-text-muted); font-size: 0.9rem; margin: 0; }
  .res-body { display: flex; flex-wrap: wrap; gap: 1.5rem; margin-top: 1.25rem; }
  .res-info-item { display: flex; gap: 0.75rem; align-items: flex-start; }
  .res-info-item i {
    font-size: 1.25rem;
    color: var(--lux-accent);
    background: rgba(212, 175, 55, 0.1);
    padding: 0.45rem;
    border-radius: 8px;
  }
  .res-info-item .label {
    display: block;
    font-size: 0.72rem;
    color: var(--lux-text-muted);
    text-transform: uppercase;
  }
  .res-info-item .value { font-weight: 600; }
  .res-actions {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-end;
    gap: 0.75rem;
    min-width: 140px;
  }
  .meta { font-size: 0.85rem; color: var(--lux-text-muted); }
  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.65rem;
    border-radius: 99px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
  }
  .tone-success { background: rgba(40, 167, 69, 0.15); color: #28a745; }
  .tone-info { background: rgba(23, 162, 184, 0.15); color: #17a2b8; }
  .tone-warning { background: rgba(255, 193, 7, 0.15); color: #ffc107; }
  .tone-danger { background: rgba(220, 53, 69, 0.15); color: #dc3545; }
  .tone-muted { background: rgba(108, 117, 125, 0.15); color: #adb5bd; }
  .lux-alert-error {
    background: rgba(220, 53, 69, 0.1);
    color: #ff6b6b;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
  }
  .lux-alert-success {
    background: rgba(20, 108, 67, 0.1);
    color: #2ecc71;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
  }
  .lux-empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: var(--lux-text-muted);
    background: var(--lux-surface);
    border-radius: var(--lux-radius);
    border: 1px dashed var(--lux-border);
  }
  .lux-empty-state i { font-size: 3rem; margin-bottom: 1rem; display: block; }
  .lux-empty-state h3 { color: var(--lux-heading); margin-bottom: 0.5rem; }
  `],
})
export class ClientReservationsPageComponent {
  private readonly reservationService = inject(ReservationService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly reservations = signal<Reservation[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly message = signal('');
  readonly cancellingId = signal<number | null>(null);

  readonly moneyFmt = money;
  readonly dateFmt = shortDate;
  readonly statusLabel = reservationStatusLabel;
  readonly statusTone = reservationStatusTone;

  constructor() {
    this.reload();
  }

  vehicleLabel(res: Reservation): string {
    const parts = [res.marque_vehicule, res.modele_vehicule].filter(Boolean);
    return parts.length ? parts.join(' ') : 'Véhicule';
  }

  canCancel(res: Reservation): boolean {
    return canCancelReservation(res, false);
  }

  cancel(res: Reservation): void {
    if (!res.id || !this.canCancel(res)) return;
    if (!confirm('Êtes-vous sûr de vouloir annuler cette réservation ? Cette action est irréversible.')) return;
    this.cancellingId.set(res.id);
    this.error.set('');
    this.message.set('');
    this.reservationService
      .annulerReservation(res.id)
      .pipe(finalize(() => { this.cancellingId.set(null); this.cdr.markForCheck(); }))
      .subscribe({
        next: (response: ReservationCancellationResponse) => {
          let msg = response.message;
          if (response.montant_remboursé) {
            msg += ` (Remboursement: ${this.moneyFmt(response.montant_remboursé)}`;
            if (response.montant_pénalité) {
              msg += `, Pénalité: ${this.moneyFmt(response.montant_pénalité)}`;
            }
            msg += ')';
          }
          this.message.set(msg);
          this.cdr.markForCheck();
          this.reload();
        },
        error: (err: unknown) => { this.error.set(extractApiError(err)); this.cdr.markForCheck(); },
      });
  }

  private reload(): void {
    this.loading.set(true);
    this.error.set('');
    this.reservationService
      .getMesReservations()
      .pipe(finalize(() => { this.loading.set(false); this.cdr.markForCheck(); }))
      .subscribe({
        next: list => { this.reservations.set(list); this.cdr.markForCheck(); },
        error: (err: unknown) => { this.error.set(extractApiError(err)); this.cdr.markForCheck(); },
      });
  }
}
