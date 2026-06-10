import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ReservationService, ReservationCancellationResponse } from '@app/core/services/reservation.service';
import { extractApiError } from '@app/core/utils/api.util';
import { Reservation } from '@app/models/reservation.model';
import {
  canCancelReservation,
  imageUrl,
  money,
  reservationStatusLabel,
  shortDate,
} from '@app/shared/formatters';

@Component({
  selector: 'app-client-reservations-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
  <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
    <div>
      <h2 class="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Mes réservations</h2>
      <p class="text-gray-500 dark:text-gray-400 mt-1">Suivez vos locations, paiements et annulations.</p>
    </div>
    <a routerLink="/catalogue" class="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-carloc-900 dark:bg-white text-white dark:text-carloc-950 font-bold rounded-lg hover:bg-black dark:hover:bg-gray-200 transition-colors">
      <i class="bi bi-plus-lg"></i>
      Nouvelle réservation
    </a>
  </div>

  @if (error()) {
    <div class="rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-red-700 dark:text-red-300 font-medium">
      {{ error() }}
    </div>
  }
  @if (message()) {
    <div class="rounded-lg border border-green-200 dark:border-green-900/40 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-green-700 dark:text-green-300 font-medium">
      {{ message() }}
    </div>
  }

  @if (loading()) {
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      @for (i of [1, 2, 3, 4, 5, 6]; track i) {
        <div class="h-96 rounded-lg bg-gray-100 dark:bg-carloc-900 animate-pulse"></div>
      }
    </div>
  } @else if (reservations().length) {
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      @for (res of reservations(); track res.id) {
        <article class="rounded-lg overflow-hidden bg-white dark:bg-carloc-900 border border-gray-200 dark:border-carloc-800 shadow-sm hover:shadow-lg transition-shadow">
          <div class="relative aspect-[16/10] bg-gray-100 dark:bg-carloc-800">
            <img
              [src]="reservationImage(res)"
              [alt]="vehicleLabel(res)"
              class="w-full h-full object-cover"
              (error)="useFallbackImage($event, res)"
            />
            <span class="absolute left-3 top-3 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide border" [ngClass]="statusClass(res)">
              {{ statusLabel(res) }}
            </span>
          </div>
          <div class="p-5 space-y-4">
            <div class="min-w-0">
              <div class="flex items-start justify-between gap-3">
                <h3 class="text-lg font-black text-gray-900 dark:text-white truncate">{{ vehicleLabel(res) }}</h3>
                <span class="shrink-0 text-xs font-bold text-gray-500 dark:text-gray-400">{{ res.immatriculation || 'N/A' }}</span>
              </div>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ res.categorie_vehicule || 'Catégorie non renseignée' }}</p>
            </div>

            <div class="grid grid-cols-2 gap-3 text-sm">
              <div class="rounded-lg bg-gray-50 dark:bg-carloc-800/60 p-3">
                <span class="block text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Début</span>
                <strong class="text-gray-900 dark:text-white">{{ dateFmt(res.date_debut) }}</strong>
              </div>
              <div class="rounded-lg bg-gray-50 dark:bg-carloc-800/60 p-3">
                <span class="block text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Fin</span>
                <strong class="text-gray-900 dark:text-white">{{ dateFmt(res.date_fin) }}</strong>
              </div>
              <div class="rounded-lg bg-gray-50 dark:bg-carloc-800/60 p-3">
                <span class="block text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Durée</span>
                <strong class="text-gray-900 dark:text-white">{{ res.nb_jours ?? '-' }} j</strong>
              </div>
              <div class="rounded-lg bg-gray-50 dark:bg-carloc-800/60 p-3">
                <span class="block text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Reste</span>
                <strong class="text-gray-900 dark:text-white">{{ moneyFmt(res.solde_restant) }}</strong>
              </div>
            </div>

            <div class="flex items-center justify-between gap-3 pt-1">
              <div>
                <span class="block text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Montant</span>
                <strong class="text-xl font-black text-gray-900 dark:text-white">{{ moneyFmt(res.montant_du ?? res.montant_total) }}</strong>
              </div>
              @if (canCancel(res)) {
                <button type="button" class="px-3 py-2 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-300 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50" [disabled]="cancellingId() === res.id" (click)="cancel(res)">
                  @if (cancellingId() === res.id) {
                    <i class="bi bi-arrow-repeat animate-spin"></i>
                  } @else {
                    Annuler
                  }
                </button>
              }
            </div>
          </div>
        </article>
      }
    </div>

    <div class="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200 dark:border-carloc-800 pt-5">
      <span class="text-sm font-semibold text-gray-500 dark:text-gray-400">
        Page {{ page() }} sur {{ totalPages() }} · {{ count() }} réservation(s)
      </span>
      <div class="flex items-center gap-2">
        <button class="px-4 py-2 rounded-lg border border-gray-200 dark:border-carloc-700 font-bold text-gray-700 dark:text-gray-200 disabled:opacity-40" type="button" [disabled]="page() <= 1 || loading()" (click)="goToPage(page() - 1)">
          Précédent
        </button>
        <button class="px-4 py-2 rounded-lg border border-gray-200 dark:border-carloc-700 font-bold text-gray-700 dark:text-gray-200 disabled:opacity-40" type="button" [disabled]="page() >= totalPages() || loading()" (click)="goToPage(page() + 1)">
          Suivant
        </button>
      </div>
    </div>
  } @else {
    <div class="rounded-lg border border-dashed border-gray-300 dark:border-carloc-700 bg-white dark:bg-carloc-900 p-10 text-center">
      <i class="bi bi-calendar-x text-4xl text-gray-400"></i>
      <h3 class="text-xl font-black text-gray-900 dark:text-white mt-4">Aucune réservation</h3>
      <p class="text-gray-500 dark:text-gray-400 mt-2">Parcourez le catalogue pour louer votre premier véhicule.</p>
      <a routerLink="/catalogue" class="inline-flex items-center gap-2 mt-6 px-4 py-2.5 rounded-lg bg-carloc-900 dark:bg-white text-white dark:text-carloc-950 font-bold">
        Voir le catalogue
      </a>
    </div>
  }
</div>
  `,
})
export class ClientReservationsPageComponent {
  private readonly reservationService = inject(ReservationService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly reservations = signal<Reservation[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly message = signal('');
  readonly cancellingId = signal<number | null>(null);
  readonly page = signal(1);
  readonly count = signal(0);

  readonly moneyFmt = money;
  readonly dateFmt = shortDate;
  readonly statusLabel = reservationStatusLabel;

  constructor() {
    this.reload();
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.count() / 10));
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.page.set(page);
    this.reload();
  }

  vehicleLabel(res: Reservation): string {
    const parts = [res.marque_vehicule, res.modele_vehicule].filter(Boolean);
    return parts.length ? parts.join(' ') : 'Véhicule';
  }

  reservationImage(res: Reservation): string {
    return imageUrl(res.image_vehicule_url ?? res.image_vehicule, res.categorie_vehicule, res.id ?? 0);
  }

  useFallbackImage(event: Event, res: Reservation): void {
    const img = event.target as HTMLImageElement | null;
    if (!img) return;
    img.onerror = null;
    img.src = imageUrl(null, res.categorie_vehicule, res.id ?? 0);
  }

  canCancel(res: Reservation): boolean {
    return canCancelReservation(res, false);
  }

  statusClass(res: Reservation): string {
    if (res.est_annulee) return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900/40';
    if (res.est_soldee) return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-carloc-800 dark:text-gray-200 dark:border-carloc-700';
    const today = new Date().toISOString().slice(0, 10);
    if (res.date_debut && res.date_fin && res.date_debut <= today && today <= res.date_fin) {
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900/40';
    }
    return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900/40';
  }

  cancel(res: Reservation): void {
    if (!res.id || !this.canCancel(res)) return;
    if (!confirm('Êtes-vous sûr de vouloir annuler cette réservation ?')) return;
    this.cancellingId.set(res.id);
    this.error.set('');
    this.message.set('');
    this.reservationService
      .annulerReservation(res.id)
      .pipe(finalize(() => { this.cancellingId.set(null); this.cdr.markForCheck(); }))
      .subscribe({
        next: (response: ReservationCancellationResponse) => {
          this.message.set(response.message);
          this.reload();
        },
        error: (err: unknown) => { this.error.set(extractApiError(err)); this.cdr.markForCheck(); },
      });
  }

  private reload(): void {
    this.loading.set(true);
    this.error.set('');
    this.reservationService
      .getReservations(this.page())
      .pipe(finalize(() => { this.loading.set(false); this.cdr.markForCheck(); }))
      .subscribe({
        next: response => {
          this.reservations.set(response.results ?? []);
          this.count.set(response.count ?? 0);
          this.cdr.markForCheck();
        },
        error: (err: unknown) => { this.error.set(extractApiError(err)); this.cdr.markForCheck(); },
      });
  }
}
