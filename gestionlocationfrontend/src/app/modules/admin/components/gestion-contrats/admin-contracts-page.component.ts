import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminService, Contrat } from '@app/core/services/admin.service';
import { ReservationService } from '@app/core/services/reservation.service';
import { extractApiError } from '@app/core/utils/api.util';
import { Reservation } from '@app/models/reservation.model';
import { money, shortDate, statusTone } from '@app/shared/formatters';

@Component({
  selector: 'app-admin-contracts-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="admin-page">
      <div class="section-heading">
        <div>
          <p class="eyebrow">{{ contrats().length }} contrats</p>
          <h2>Contrats de location</h2>
        </div>
        <div class="section-actions">
          <button class="btn btn-primary" (click)="openCreateModal()">
            <i class="bi bi-plus-lg" aria-hidden="true"></i>
            Nouveau contrat
          </button>
        </div>
      </div>

      @if (message()) {
        <div class="alert-banner success">{{ message() }}</div>
      }
      @if (error()) {
        <div class="alert-banner danger">{{ error() }}</div>
      }

      <section class="surface-panel">
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Contrat</th>
                <th>Réservation</th>
                <th>Date de Signature</th>
                <th>Montant</th>
                <th>Solde Restant</th>
                <th>Kilométrage Retour</th>
                <th class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                <tr><td colspan="7" class="muted-cell">Chargement...</td></tr>
              } @else {
                @for (contrat of contrats(); track contrat.id) {
                  <tr>
                    <td><strong>#{{ contrat.id }}</strong></td>
                    <td>{{ contractReservationLabel(contrat) }}</td>
                    <td>{{ dateFmt(contrat.date_signature) }}</td>
                    <td>{{ moneyFmt(contrat.montant_location) }}</td>
                    <td>{{ moneyFmt(contrat.solde_reservation) }}</td>
                    <td>
                      <span [class]="'status-pill ' + tone(!!contrat.kilometrage_retour)">
                        {{ contrat.kilometrage_retour ? contrat.kilometrage_retour + ' km' : 'Ouvert' }}
                      </span>
                    </td>
                    <td class="text-end">
                      <button class="btn btn-icon" type="button" (click)="generatePdf(contrat)" aria-label="Générer PDF" title="Télécharger le contrat">
                        <i class="bi bi-filetype-pdf" aria-hidden="true"></i>
                      </button>
                      @if (!contrat.kilometrage_retour) {
                        <button class="btn btn-icon" type="button" (click)="selectClose(contrat)" aria-label="Clôturer" title="Clôturer le contrat">
                          <i class="bi bi-check2-square" aria-hidden="true"></i>
                        </button>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="7" class="muted-cell">Aucun contrat.</td></tr>
                }
              }
            </tbody>
          </table>
        </div>
      </section>

      <!-- Modal Nouveau Contrat -->
      @if (showCreateModal()) {
        <div class="modal-overlay" (click)="closeCreateModal()">
          <div class="modal-container" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Créer un nouveau contrat</h3>
              <button class="modal-close-btn" (click)="closeCreateModal()" aria-label="Fermer">
                <i class="bi bi-x"></i>
              </button>
            </div>
            <div class="modal-body">
              @if (modalError()) {
                <div class="alert-banner danger" style="margin-bottom: 1.25rem;">{{ modalError() }}</div>
              }
              <form [formGroup]="contractForm" (ngSubmit)="create()" class="stack-form">
                <label>
                  <span>Réservation</span>
                  <select formControlName="reservation">
                    <option [value]="0">Sélectionner une réservation validée</option>
                    @for (reservation of contractableReservations(); track reservation.id) {
                      <option [value]="reservation.id">
                        #{{ reservation.id }} · {{ reservation.nom_client }} · {{ vehicleLabel(reservation) }}
                      </option>
                    }
                  </select>
                </label>
                <label>
                  <span>Kilométrage de départ (km)</span>
                  <input type="number" min="0" formControlName="kilometrage_depart" placeholder="Ex: 45000" />
                </label>

                <div style="margin-top: 2rem; display: flex; justify-content: flex-end; gap: 0.75rem;">
                  <button type="button" class="btn btn-secondary" (click)="closeCreateModal()">Annuler</button>
                  <button class="btn btn-primary" type="submit" [disabled]="contractForm.invalid || saving()">
                    @if (saving()) {
                      <span>Création...</span>
                    } @else {
                      <i class="bi bi-file-earmark-plus" aria-hidden="true"></i>
                      <span>Créer le contrat</span>
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      }

      <!-- Modal Clôturer Contrat -->
      @if (closingContract(); as contrat) {
        <div class="modal-overlay" (click)="closingContract.set(null)">
          <div class="modal-container narrow" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Clôturer le contrat #{{ contrat.id }}</h3>
              <button class="modal-close-btn" (click)="closingContract.set(null)" aria-label="Fermer">
                <i class="bi bi-x"></i>
              </button>
            </div>
            <div class="modal-body">
              @if (modalError()) {
                <div class="alert-banner danger" style="margin-bottom: 1.25rem;">{{ modalError() }}</div>
              }
              <div class="modal-confirm-content" style="padding-top: 0; margin-bottom: 1rem;">
                <i class="bi bi-shield-lock modal-confirm-icon warning" style="font-size: 2.5rem; margin-bottom: 0.5rem;"></i>
                <h4>Confirmation de clôture</h4>
                <p>Vous êtes sur le point de clôturer le contrat. Cette action mettra à jour le kilométrage du véhicule.</p>
              </div>
              <form [formGroup]="closeForm" (ngSubmit)="close()" class="stack-form">
                <label>
                  <span>Kilométrage de retour (km)</span>
                  <input type="number" min="0" formControlName="kilometrage_retour" />
                </label>
                <label>
                  <span>Date effective de retour</span>
                  <input type="date" formControlName="date_retour" />
                </label>

                <div style="margin-top: 2rem; display: flex; justify-content: flex-end; gap: 0.75rem;">
                  <button type="button" class="btn btn-secondary" (click)="closingContract.set(null)">Annuler</button>
                  <button class="btn btn-primary" type="submit" [disabled]="closeForm.invalid || saving()">
                    @if (saving()) {
                      <span>Validation...</span>
                    } @else {
                      <i class="bi bi-check2-circle" aria-hidden="true"></i>
                      <span>Clôturer définitivement</span>
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      }
    </section>
  `,
})
export class AdminContractsPageComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly admin = inject(AdminService);
  private readonly reservationsService = inject(ReservationService);

  readonly contrats = signal<Contrat[]>([]);
  readonly reservations = signal<Reservation[]>([]);
  readonly closingContract = signal<Contrat | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly modalError = signal('');
  readonly message = signal('');
  readonly showCreateModal = signal(false);

  readonly contractForm = this.fb.group({
    reservation: [0, [Validators.required, Validators.min(1)]],
    kilometrage_depart: [0, [Validators.required, Validators.min(0)]],
  });

  readonly closeForm = this.fb.group({
    kilometrage_retour: [0, [Validators.required, Validators.min(0)]],
    date_retour: [this.today(), Validators.required],
  });

  readonly moneyFmt = money;
  readonly dateFmt = shortDate;
  readonly tone = statusTone;

  constructor() {
    this.load();
  }

  contractableReservations(): Reservation[] {
    return this.reservations().filter(reservation => !reservation.est_annulee && !reservation.contrat_id);
  }

  vehicleLabel(reservation: Reservation): string {
    return `${reservation.marque_vehicule ?? ''} ${reservation.modele_vehicule ?? ''}`.trim() || 'Véhicule';
  }

  contractReservationLabel(contrat: Contrat): string {
    const reservation = contrat.reservation_details as Reservation | undefined;
    if (reservation) {
      return `#${reservation.id} · ${reservation.nom_client ?? 'Client'} · ${this.vehicleLabel(reservation)}`;
    }
    return `#${contrat.reservation}`;
  }

  openCreateModal(): void {
    this.contractForm.reset({
      reservation: 0,
      kilometrage_depart: 0
    });
    this.modalError.set('');
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.modalError.set('');
  }

  create(): void {
    if (this.contractForm.invalid) return;
    const values = this.contractForm.getRawValue();
    this.saving.set(true);
    this.error.set('');
    this.modalError.set('');
    this.message.set('');
    this.admin
      .createContrat({
        reservation: Number(values.reservation),
        kilometrage_depart: Number(values.kilometrage_depart),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.message.set('Contrat créé.');
          this.showCreateModal.set(false);
          this.load();
        },
        error: (err: unknown) => this.modalError.set(extractApiError(err)),
      });
  }

  generatePdf(contrat: Contrat): void {
    this.error.set('');
    this.message.set('');
    this.admin.genererPdfContrat(contrat.id).subscribe({
      next: () => {
        this.message.set('PDF du contrat généré.');
        this.load();
      },
      error: (err: unknown) => this.error.set(extractApiError(err)),
    });
  }

  selectClose(contrat: Contrat): void {
    this.modalError.set('');
    this.closingContract.set(contrat);
    this.closeForm.patchValue({
      kilometrage_retour: contrat.kilometrage_retour ?? contrat.kilometrage_depart ?? 0,
      date_retour: this.today(),
    });
  }

  close(): void {
    const contrat = this.closingContract();
    if (!contrat || this.closeForm.invalid) return;
    const values = this.closeForm.getRawValue();
    this.saving.set(true);
    this.error.set('');
    this.modalError.set('');
    this.message.set('');
    this.admin
      .cloturerContrat(contrat.id, {
        kilometrage_retour: Number(values.kilometrage_retour),
        date_retour: values.date_retour,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.message.set('Contrat clôturé.');
          this.closingContract.set(null);
          this.load();
        },
        error: (err: unknown) => this.modalError.set(extractApiError(err)),
      });
  }

  private load(): void {
    this.loading.set(true);
    this.admin.getContrats().subscribe({
      next: contrats => this.contrats.set(contrats),
      error: (err: unknown) => this.error.set(extractApiError(err)),
    });
    this.reservationsService
      .getAllReservations()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: reservations => this.reservations.set(reservations),
        error: (err: unknown) => this.error.set(extractApiError(err)),
      });
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}

