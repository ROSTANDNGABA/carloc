import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, switchMap } from 'rxjs';
import { AdminService, Paiement } from '@app/core/services/admin.service';
import { FactureService } from '@app/core/services/facture.service';
import { ReservationService } from '@app/core/services/reservation.service';
import { extractApiError } from '@app/core/utils/api.util';
import { Facture } from '@app/models/facture.model';
import { Reservation } from '@app/models/reservation.model';
import { money, shortDate, statusLabel, statusTone } from '@app/shared/formatters';

@Component({
  selector: 'app-admin-finance-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="admin-page">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Encaissements & factures</p>
          <h2>Finance</h2>
        </div>
        <div class="section-actions">
          <button class="btn btn-primary" (click)="openPaymentModal()">
            <i class="bi bi-plus-lg" aria-hidden="true"></i>
            Nouveau paiement
          </button>
        </div>
      </div>

      @if (message()) {
        <div class="alert-banner success">{{ message() }}</div>
      }
      @if (error()) {
        <div class="alert-banner danger">{{ error() }}</div>
      }

      <div class="admin-lists-container">
        <!-- Paiements récents -->
        <section class="surface-panel list-panel">
          <div class="panel-heading">
            <h3>Paiements récents</h3>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Réservation</th>
                  <th>Montant</th>
                  <th>Mode</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                @if (loading()) {
                  <tr><td colspan="5" class="muted-cell">Chargement...</td></tr>
                } @else {
                  @for (payment of paiements(); track payment.id) {
                    <tr>
                      <td>{{ payment.nom_client ?? 'Client' }}</td>
                      <td>#{{ payment.reservation }}</td>
                      <td><strong>{{ moneyFmt(payment.montant_paye) }}</strong></td>
                      <td>{{ label(payment.mode_paiement) }}</td>
                      <td>{{ dateFmt(payment.date_paiement) }}</td>
                    </tr>
                  } @empty {
                    <tr><td colspan="5" class="muted-cell">Aucun paiement.</td></tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </section>

        <!-- Factures -->
        <section class="surface-panel">
          <div class="panel-heading">
            <h3>Factures</h3>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Numéro</th>
                  <th>Client</th>
                  <th>Véhicule</th>
                  <th>Date</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th class="text-end">PDF</th>
                </tr>
              </thead>
              <tbody>
                @for (facture of factures(); track facture.id) {
                  <tr>
                    <td><strong>{{ facture.numero }}</strong></td>
                    <td>{{ facture.nom_client ?? 'Client' }}</td>
                    <td>{{ facture.vehicule_info ?? 'Véhicule' }}</td>
                    <td>{{ dateFmt(facture.date_emission) }}</td>
                    <td>{{ moneyFmt(facture.montant_total) }}</td>
                    <td><span [class]="'status-pill ' + tone(facture.statut)">{{ label(facture.statut) }}</span></td>
                    <td class="text-end">
                      <button class="btn btn-icon" type="button" (click)="download(facture)" [disabled]="workingPdf() === facture.id">
                        <i class="bi bi-filetype-pdf" aria-hidden="true"></i>
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="7" class="muted-cell">Aucune facture.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- Modal Nouveau Paiement -->
      @if (showPaymentModal()) {
        <div class="modal-overlay" (click)="closePaymentModal()">
          <div class="modal-container" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Enregistrer un paiement</h3>
              <button class="modal-close-btn" (click)="closePaymentModal()" aria-label="Fermer">
                <i class="bi bi-x"></i>
              </button>
            </div>
            <div class="modal-body">
              @if (modalError()) {
                <div class="alert-banner danger" style="margin-bottom: 1.25rem;">{{ modalError() }}</div>
              }
              <form [formGroup]="paymentForm" (ngSubmit)="createPayment()" class="stack-form">
                <label>
                  <span>Réservation</span>
                  <select formControlName="reservation">
                    <option [value]="0">Sélectionner une réservation en attente</option>
                    @for (reservation of payableReservations(); track reservation.id) {
                      <option [value]="reservation.id">
                        #{{ reservation.id }} · {{ reservation.nom_client }} (Solde restant : {{ moneyFmt(reservation.solde_restant) }})
                      </option>
                    }
                  </select>
                </label>
                <label>
                  <span>Montant payé (FCFA / EUR)</span>
                  <input type="number" min="1" formControlName="montant_paye" placeholder="Ex: 50000" />
                </label>
                <label>
                  <span>Mode de paiement</span>
                  <select formControlName="mode_paiement">
                    <option value="especes">Espèces</option>
                    <option value="carte">Carte Bancaire</option>
                    <option value="virement">Virement</option>
                  </select>
                </label>
                <label class="check-row">
                  <input type="checkbox" formControlName="est_acompte" />
                  <span>Marquer comme acompte</span>
                </label>

                <div style="margin-top: 2rem; display: flex; justify-content: flex-end; gap: 0.75rem;">
                  <button type="button" class="btn btn-secondary" (click)="closePaymentModal()">Annuler</button>
                  <button class="btn btn-primary" type="submit" [disabled]="paymentForm.invalid || saving()">
                    @if (saving()) {
                      <span>Enregistrement...</span>
                    } @else {
                      <i class="bi bi-cash-coin" aria-hidden="true"></i>
                      <span>Encaisser</span>
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
export class AdminFinancePageComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly admin = inject(AdminService);
  private readonly reservationsService = inject(ReservationService);
  private readonly facturesService = inject(FactureService);

  readonly paiements = signal<Paiement[]>([]);
  readonly reservations = signal<Reservation[]>([]);
  readonly factures = signal<Facture[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly workingPdf = signal<number | null>(null);
  readonly error = signal('');
  readonly modalError = signal('');
  readonly message = signal('');
  readonly showPaymentModal = signal(false);

  readonly paymentForm = this.fb.group({
    reservation: [0, [Validators.required, Validators.min(1)]],
    montant_paye: [0, [Validators.required, Validators.min(1)]],
    mode_paiement: ['especes', Validators.required],
    est_acompte: [false],
  });

  readonly moneyFmt = money;
  readonly dateFmt = shortDate;
  readonly label = statusLabel;
  readonly tone = statusTone;

  constructor() {
    this.load();
  }

  payableReservations(): Reservation[] {
    return this.reservations().filter(item => !item.est_annulee && Number(item.solde_restant ?? 0) > 0);
  }

  openPaymentModal(): void {
    this.paymentForm.reset({
      reservation: 0,
      montant_paye: 0,
      mode_paiement: 'especes',
      est_acompte: false
    });
    this.modalError.set('');
    this.showPaymentModal.set(true);
  }

  closePaymentModal(): void {
    this.showPaymentModal.set(false);
    this.modalError.set('');
  }

  createPayment(): void {
    if (this.paymentForm.invalid) return;
    const values = this.paymentForm.getRawValue();
    this.saving.set(true);
    this.error.set('');
    this.modalError.set('');
    this.message.set('');
    this.admin
      .createPaiement({
        reservation: Number(values.reservation),
        montant_paye: Number(values.montant_paye),
        mode_paiement: values.mode_paiement,
        est_acompte: values.est_acompte,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.message.set('Paiement enregistré.');
          this.showPaymentModal.set(false);
          this.load();
        },
        error: (err: unknown) => this.modalError.set(extractApiError(err)),
      });
  }

  download(facture: Facture): void {
    this.workingPdf.set(facture.id);
    const source = facture.fichier_pdf_url
      ? this.facturesService.downloadPdf(facture.id)
      : this.facturesService.genererPdf(facture.id).pipe(switchMap(updated => this.facturesService.downloadPdf(updated.id)));

    source.pipe(finalize(() => this.workingPdf.set(null))).subscribe({
      next: blob => {
        if (typeof window === 'undefined') return;
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      },
      error: (err: unknown) => this.error.set(extractApiError(err)),
    });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');
    this.admin.getPaiements().subscribe({
      next: paiements => this.paiements.set(paiements),
      error: (err: unknown) => this.error.set(extractApiError(err)),
    });
    this.reservationsService.getAllReservations().subscribe({
      next: reservations => this.reservations.set(reservations),
      error: (err: unknown) => this.error.set(extractApiError(err)),
    });
    this.facturesService
      .getFactures()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: factures => this.factures.set(factures),
        error: (err: unknown) => this.error.set(extractApiError(err)),
      });
  }
}

