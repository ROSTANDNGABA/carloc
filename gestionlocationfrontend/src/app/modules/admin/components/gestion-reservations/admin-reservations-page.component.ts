import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, switchMap } from 'rxjs';
import { ClientService } from '@app/core/services/client.service';
import { ReservationService, ReservationCancellationResponse } from '@app/core/services/reservation.service';
import { VehiculeService } from '@app/core/services/vehicule.service';
import { reservationDatesValidator } from '@app/core/validators/reservation.validators';
import { extractApiError, extractReservationError } from '@app/core/utils/api.util';
import { Client } from '@app/models/client.model';
import { Reservation } from '@app/models/reservation.model';
import { Vehicule } from '@app/models/vehicule.model';
import { canCancelReservation, clientName, money, reservationStatusLabel, shortDate, statusTone, todayIso } from '@app/shared/formatters';

@Component({
  selector: 'app-admin-reservations-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="admin-page">
      <div class="section-heading">
        <div>
          <p class="eyebrow">{{ totalCount() }} réservations</p>
          <h2>Planning des locations</h2>
        </div>
        <div class="section-actions">
          <button class="btn btn-primary" type="button" (click)="openCreateModal()">
            <i class="bi bi-calendar-plus" aria-hidden="true"></i>
            Nouvelle réservation
          </button>
        </div>
      </div>

      @if (message()) {
        <div class="alert-banner success">{{ message() }}</div>
      }
      @if (error()) {
        <div class="alert-banner danger">{{ error() }}</div>
      }

      <section class="surface-panel list-panel" style="margin-top: 1.5rem;">
        <div class="panel-heading" style="display:flex;flex-wrap:wrap;gap:1rem;align-items:center;justify-content:space-between;">
          <h3>Liste des réservations</h3>
          <div style="display:flex;gap:0.5rem;">
            <input class="form-control" type="search" placeholder="Rechercher…" [value]="searchTerm()" (input)="searchTerm.set($any($event.target).value)" (keyup.enter)="applySearch()" />
            <button class="btn btn-outline-secondary" type="button" (click)="applySearch()">Rechercher</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Véhicule</th>
                <th>Période</th>
                <th>Montant</th>
                <th>Solde</th>
                <th>Statut</th>
                <th class="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                <tr><td colspan="7" class="muted-cell">Chargement...</td></tr>
              } @else {
                @for (reservation of reservations(); track reservation.id) {
                  <tr>
                    <td>{{ clientLabel(reservation) }}</td>
                    <td>{{ vehicleLabel(reservation) }}</td>
                    <td>{{ dateFmt(reservation.date_debut) }} - {{ dateFmt(reservation.date_fin) }}</td>
                    <td>{{ moneyFmt(reservation.montant_du ?? reservation.montant_total) }}</td>
                    <td>{{ moneyFmt(reservation.solde_restant) }}</td>
                    <td>
                      <span [class]="'status-pill ' + reservationTone(reservation)">
                        {{ reservationStatusFmt(reservation) }}
                      </span>
                    </td>
                    <td class="text-end">
                      <button
                        class="btn btn-icon danger"
                        type="button"
                        [disabled]="!canCancelFmt(reservation)"
                        (click)="askCancel(reservation)"
                        aria-label="Annuler"
                      >
                        <i class="bi bi-x-circle" aria-hidden="true"></i>
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="7" class="muted-cell">Aucune réservation.</td></tr>
                }
              }
            </tbody>
          </table>
        </div>
        <div style="display:flex;justify-content:space-between;padding:1rem 1.25rem;border-top:1px solid var(--carloc-border);">
          <button class="btn btn-outline-secondary btn-sm" type="button" [disabled]="!hasPrevious() || loading()" (click)="goPage(page() - 1)">Précédent</button>
          <span class="muted-cell">Page {{ page() }}</span>
          <button class="btn btn-outline-secondary btn-sm" type="button" [disabled]="!hasNext() || loading()" (click)="goPage(page() + 1)">Suivant</button>
        </div>
      </section>

      <!-- Formulaire Modal -->
      @if (showFormModal()) {
        <div class="modal-overlay" (click)="closeFormModal()">
          <div class="modal-container" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Créer une réservation</h3>
              <button class="modal-close-btn" type="button" (click)="closeFormModal()" aria-label="Fermer">
                <i class="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </div>
            <form [formGroup]="reservationForm" (ngSubmit)="create()" class="stack-form" style="margin: 0;">
              <div class="modal-body">
                <label>
                  <span>Client</span>
                  <select formControlName="client">
                    <option [value]="0">Sélectionner un client</option>
                    @for (client of clients(); track client.id) {
                      <option [value]="client.id">{{ clientNameFmt(client.nom, client.prenom) }}</option>
                    }
                  </select>
                </label>
                <label>
                  <span>Véhicule</span>
                  <select formControlName="vehicule" (change)="checkAvailability()">
                    <option [value]="0">Sélectionner un véhicule</option>
                    @for (vehicle of vehicles(); track vehicle.id) {
                      <option [value]="vehicle.id">{{ vehicle.marque }} {{ vehicle.modele }} · {{ vehicle.immatriculation }} ({{ vehicle.statut }})</option>
                    }
                  </select>
                </label>
                <div class="form-grid two">
                  <label>
                    <span>Date de début</span>
                    <input type="date" formControlName="date_debut" [min]="minDate" (change)="checkAvailability()" />
                  </label>
                  <label>
                    <span>Date de fin</span>
                    <input type="date" formControlName="date_fin" [min]="reservationForm.value.date_debut || minDate" (change)="checkAvailability()" />
                  </label>
                </div>
                @if (reservationForm.hasError('dateRange') || reservationForm.hasError('dateInPast')) {
                  <p class="muted-cell">Dates invalides : fin après début, début non passée.</p>
                }
                @if (availabilityHint()) {
                  <p class="muted-cell">{{ availabilityHint() }}</p>
                }
              </div>
              <div class="modal-footer">
                <button class="btn btn-quiet" type="button" (click)="closeFormModal()">Annuler</button>
                <button class="btn btn-primary" type="submit" [disabled]="reservationForm.invalid || saving()">
                  <i class="bi bi-calendar-plus" aria-hidden="true"></i>
                  Réserver
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Confirmation Annulation Modal -->
      @if (showCancelModal()) {
        <div class="modal-overlay" (click)="closeCancelModal()">
          <div class="modal-container narrow" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Annulation</h3>
              <button class="modal-close-btn" type="button" (click)="closeCancelModal()" aria-label="Fermer">
                <i class="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </div>
            <div class="modal-body">
              <div class="modal-confirm-content">
                <i class="bi bi-exclamation-octagon modal-confirm-icon" aria-hidden="true" style="color: var(--carloc-primary);"></i>
                <h4>Annuler cette réservation ?</h4>
                <p>Êtes-vous sûr de vouloir annuler la réservation #<strong>{{ reservationToCancel()?.id }}</strong> pour le client <strong>{{ reservationToCancel()?.nom_client }} {{ reservationToCancel()?.prenom_client }}</strong> ?</p>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-quiet" type="button" (click)="closeCancelModal()">Retour</button>
              <button class="btn btn-primary" type="button" (click)="confirmCancel()" style="background-color: var(--carloc-primary);">
                <i class="bi bi-x-circle" aria-hidden="true"></i>
                Confirmer l'annulation
              </button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
})
export class AdminReservationsPageComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly reservationsService = inject(ReservationService);
  private readonly clientsService = inject(ClientService);
  private readonly vehiclesService = inject(VehiculeService);

  readonly reservations = signal<Reservation[]>([]);
  readonly totalCount = signal(0);
  readonly page = signal(1);
  readonly searchTerm = signal('');
  readonly hasNext = signal(false);
  readonly hasPrevious = signal(false);
  readonly clients = signal<Client[]>([]);
  readonly vehicles = signal<Vehicule[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly cancelling = signal<number | null>(null);
  readonly error = signal('');
  readonly message = signal('');

  readonly showFormModal = signal(false);
  readonly showCancelModal = signal(false);
  readonly reservationToCancel = signal<Reservation | null>(null);

  readonly minDate = todayIso();
  readonly availabilityHint = signal('');

  readonly reservationForm = this.fb.group(
    {
      client: [0, [Validators.required, Validators.min(1)]],
      vehicule: [0, [Validators.required, Validators.min(1)]],
      date_debut: [this.dateOffset(1), Validators.required],
      date_fin: [this.dateOffset(4), Validators.required],
    },
    { validators: reservationDatesValidator() },
  );

  readonly moneyFmt = money;
  readonly dateFmt = shortDate;
  readonly clientNameFmt = clientName;
  readonly reservationStatusFmt = reservationStatusLabel;
  readonly canCancelFmt = (r: Reservation) => canCancelReservation(r, true);

  constructor() {
    this.load();
    this.loadRefs();
  }

  clientLabel(reservation: Reservation): string {
    return clientName(reservation.nom_client, reservation.prenom_client);
  }

  vehicleLabel(reservation: Reservation): string {
    return `${reservation.marque_vehicule ?? ''} ${reservation.modele_vehicule ?? ''}`.trim() || 'Véhicule';
  }

  reservationTone(reservation: Reservation): string {
    if (reservation.est_annulee) return statusTone('annulee');
    if (reservation.est_soldee) return statusTone('payee');
    return statusTone('emise');
  }

  openCreateModal(): void {
    this.reservationForm.patchValue({
      client: 0,
      vehicule: 0,
      date_debut: this.dateOffset(1),
      date_fin: this.dateOffset(2),
    });
    this.showFormModal.set(true);
  }

  closeFormModal(): void {
    this.showFormModal.set(false);
  }

  create(): void {
    if (this.reservationForm.invalid) {
      this.reservationForm.markAllAsTouched();
      return;
    }
    const values = this.reservationForm.getRawValue();
    const vehiculeId = Number(values.vehicule);
    this.saving.set(true);
    this.error.set('');
    this.message.set('');

    this.vehiclesService
      .verifierDisponibilite(vehiculeId, values.date_debut, values.date_fin)
      .pipe(
        switchMap(result => {
          if (!result.disponible) {
            throw new Error(result.message);
          }
          return this.reservationsService.createReservation({
            client: Number(values.client),
            vehicule: vehiculeId,
            date_debut: values.date_debut,
            date_fin: values.date_fin,
          });
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.message.set('Réservation créée.');
          this.closeFormModal();
          this.load();
        },
        error: (err: unknown) => {
          if (err instanceof Error && !(err as { error?: unknown }).error) {
            this.error.set(err.message);
            return;
          }
          this.error.set(extractReservationError(err).message);
        },
      });
  }

  checkAvailability(): void {
    const values = this.reservationForm.getRawValue();
    const vehiculeId = Number(values.vehicule);
    if (!vehiculeId || !values.date_debut || !values.date_fin || this.reservationForm.invalid) {
      this.availabilityHint.set('');
      return;
    }
    this.vehiclesService.verifierDisponibilite(vehiculeId, values.date_debut, values.date_fin).subscribe({
      next: r => this.availabilityHint.set(r.message),
      error: () => this.availabilityHint.set(''),
    });
  }

  askCancel(reservation: Reservation): void {
    this.reservationToCancel.set(reservation);
    this.showCancelModal.set(true);
  }

  closeCancelModal(): void {
    this.showCancelModal.set(false);
    this.reservationToCancel.set(null);
  }

  confirmCancel(): void {
    const res = this.reservationToCancel();
    if (!res || !res.id) return;
    this.error.set('');
    this.message.set('');
    this.reservationsService
      .annulerReservation(res.id)
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
          this.closeCancelModal();
          this.load();
        },
        error: (err: unknown) => this.error.set(extractApiError(err)),
      });
  }

  applySearch(): void {
    this.page.set(1);
    this.load();
  }

  goPage(next: number): void {
    if (next < 1) return;
    this.page.set(next);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.reservationsService
      .getReservations(this.page(), this.searchTerm())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: res => {
          this.reservations.set(res.results ?? []);
          this.totalCount.set(res.count ?? 0);
          this.hasNext.set(!!res.next);
          this.hasPrevious.set(!!res.previous);
        },
        error: (err: unknown) => this.error.set(extractApiError(err)),
      });
  }

  private loadRefs(): void {
    this.clientsService.getAllClients().subscribe({
      next: clients => this.clients.set(clients),
      error: (err: unknown) => this.error.set(extractApiError(err)),
    });
    this.vehiclesService.getAllVehicules().subscribe({
      next: vehicles => this.vehicles.set(vehicles),
      error: (err: unknown) => this.error.set(extractApiError(err)),
    });
  }

  private dateOffset(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }
}
