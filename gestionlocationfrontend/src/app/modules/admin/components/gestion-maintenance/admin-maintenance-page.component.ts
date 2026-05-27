import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminService, MaintenanceItem } from '@app/core/services/admin.service';
import { VehiculeService } from '@app/core/services/vehicule.service';
import { extractApiError } from '@app/core/utils/api.util';
import { Vehicule } from '@app/models/vehicule.model';
import { money, shortDate, statusLabel } from '@app/shared/formatters';

@Component({
  selector: 'app-admin-maintenance-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="admin-page">
      <div class="section-heading">
        <div>
          <p class="eyebrow">{{ maintenances().length }} opérations</p>
          <h2>Maintenance</h2>
        </div>
        <div class="section-actions">
          <button class="btn btn-primary" (click)="openFormModal()">
            <i class="bi bi-plus-lg" aria-hidden="true"></i>
            Nouvelle opération
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
                <th>Véhicule & Travaux</th>
                <th>Date de l'opération</th>
                <th>Type</th>
                <th>Garage / Prestataire</th>
                <th>Coût de l'opération</th>
                <th class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                <tr><td colspan="6" class="muted-cell">Chargement...</td></tr>
              } @else {
                @for (item of maintenances(); track item.id) {
                  <tr>
                    <td>
                      <div>
                        <strong>{{ item.immatriculation_vehicule ?? vehicleRegistration(item.vehicule) }}</strong>
                      </div>
                      <small class="text-muted" style="display: block; margin-top: 0.25rem;">{{ item.description }}</small>
                    </td>
                    <td>{{ dateFmt(item.date_operation) }}</td>
                    <td>{{ label(item.type_operation) }}</td>
                    <td>{{ item.garage }}</td>
                    <td><strong>{{ moneyFmt(item.cout) }}</strong></td>
                    <td class="text-end">
                      <button class="btn btn-icon danger" type="button" (click)="confirmDelete(item)" aria-label="Supprimer" title="Supprimer l'opération">
                        <i class="bi bi-trash" aria-hidden="true"></i>
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="muted-cell">Aucune opération.</td></tr>
                }
              }
            </tbody>
          </table>
        </div>
      </section>

      <!-- Modal Nouvelle Opération -->
      @if (showFormModal()) {
        <div class="modal-overlay" (click)="closeFormModal()">
          <div class="modal-container" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Planifier une opération de maintenance</h3>
              <button class="modal-close-btn" (click)="closeFormModal()" aria-label="Fermer">
                <i class="bi bi-x"></i>
              </button>
            </div>
            <div class="modal-body">
              @if (modalError()) {
                <div class="alert-banner danger" style="margin-bottom: 1.25rem;">{{ modalError() }}</div>
              }
              <form [formGroup]="maintenanceForm" (ngSubmit)="create()" class="stack-form">
                <label>
                  <span>Véhicule</span>
                  <select formControlName="vehicule">
                    <option [value]="0">Sélectionner un véhicule</option>
                    @for (vehicle of vehicles(); track vehicle.id) {
                      <option [value]="vehicle.id">{{ vehicle.marque }} {{ vehicle.modele }} · {{ vehicle.immatriculation }}</option>
                    }
                  </select>
                </label>
                <div class="form-grid two">
                  <label>
                    <span>Date de l'opération</span>
                    <input type="date" formControlName="date_operation" />
                  </label>
                  <label>
                    <span>Type d'opération</span>
                    <select formControlName="type_operation">
                      <option value="revision">Révision</option>
                      <option value="reparation">Réparation</option>
                      <option value="controle">Contrôle technique</option>
                      <option value="pneus">Pneumatiques</option>
                    </select>
                  </label>
                </div>
                <label>
                  <span>Description des travaux</span>
                  <textarea rows="3" formControlName="description" placeholder="Ex: Vidange moteur, remplacement des filtres..."></textarea>
                </label>
                <div class="form-grid two">
                  <label>
                    <span>Coût (FCFA / EUR)</span>
                    <input type="number" min="0" formControlName="cout" placeholder="Ex: 75000" />
                  </label>
                  <label>
                    <span>Garage / Prestataire</span>
                    <input type="text" formControlName="garage" placeholder="Ex: Garage Premium" />
                  </label>
                </div>

                <div style="margin-top: 2rem; display: flex; justify-content: flex-end; gap: 0.75rem;">
                  <button type="button" class="btn btn-secondary" (click)="closeFormModal()">Annuler</button>
                  <button class="btn btn-primary" type="submit" [disabled]="maintenanceForm.invalid || saving()">
                    @if (saving()) {
                      <span>Planification...</span>
                    } @else {
                      <i class="bi bi-tools" aria-hidden="true"></i>
                      <span>Planifier l'opération</span>
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      }

      <!-- Modal Confirmation Suppression -->
      @if (showDeleteModal()) {
        <div class="modal-overlay" (click)="closeDeleteModal()">
          <div class="modal-container narrow" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Supprimer l'opération</h3>
              <button class="modal-close-btn" (click)="closeDeleteModal()" aria-label="Fermer">
                <i class="bi bi-x"></i>
              </button>
            </div>
            <div class="modal-body">
              <div class="modal-confirm-content" style="padding: 1rem 0;">
                <i class="bi bi-exclamation-triangle modal-confirm-icon warning"></i>
                <h4>Confirmer la suppression</h4>
                <p>Voulez-vous vraiment supprimer cette opération de maintenance ? Cette action est irréversible.</p>
              </div>
              <div class="modal-footer" style="padding: 1.5rem 0 0 0; background: transparent; border-top: none; justify-content: center; gap: 1rem;">
                <button type="button" class="btn btn-secondary" (click)="closeDeleteModal()">Annuler</button>
                <button type="button" class="btn btn-primary btn-danger" (click)="deleteConfirmed()" [disabled]="saving()">
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </section>
  `,
})
export class AdminMaintenancePageComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly admin = inject(AdminService);
  private readonly vehiclesService = inject(VehiculeService);

  readonly maintenances = signal<MaintenanceItem[]>([]);
  readonly vehicles = signal<Vehicule[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly modalError = signal('');
  readonly message = signal('');
  readonly showFormModal = signal(false);
  readonly showDeleteModal = signal(false);
  readonly itemToDelete = signal<MaintenanceItem | null>(null);

  readonly maintenanceForm = this.fb.group({
    vehicule: [0, [Validators.required, Validators.min(1)]],
    date_operation: [this.today(), Validators.required],
    type_operation: ['revision', Validators.required],
    description: ['', Validators.required],
    cout: [0, [Validators.required, Validators.min(0)]],
    garage: ['', Validators.required],
  });

  readonly moneyFmt = money;
  readonly dateFmt = shortDate;
  readonly label = statusLabel;

  constructor() {
    this.load();
  }

  vehicleRegistration(id: number): string {
    return this.vehicles().find(vehicle => vehicle.id === id)?.immatriculation ?? `#${id}`;
  }

  openFormModal(): void {
    this.maintenanceForm.reset({
      vehicule: 0,
      date_operation: this.today(),
      type_operation: 'revision',
      description: '',
      cout: 0,
      garage: '',
    });
    this.modalError.set('');
    this.showFormModal.set(true);
  }

  closeFormModal(): void {
    this.showFormModal.set(false);
    this.modalError.set('');
  }

  confirmDelete(item: MaintenanceItem): void {
    this.itemToDelete.set(item);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.itemToDelete.set(null);
  }

  deleteConfirmed(): void {
    const item = this.itemToDelete();
    if (!item) return;

    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    this.admin.deleteMaintenance(item.id).pipe(finalize(() => {
      this.saving.set(false);
      this.closeDeleteModal();
    })).subscribe({
      next: () => {
        this.message.set('Opération supprimée.');
        this.load();
      },
      error: (err: unknown) => this.error.set(extractApiError(err)),
    });
  }

  create(): void {
    if (this.maintenanceForm.invalid) return;
    const values = this.maintenanceForm.getRawValue();
    this.saving.set(true);
    this.error.set('');
    this.modalError.set('');
    this.message.set('');
    this.admin
      .createMaintenance({
        vehicule: Number(values.vehicule),
        date_operation: values.date_operation,
        type_operation: values.type_operation,
        description: values.description,
        cout: Number(values.cout),
        garage: values.garage,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.message.set('Opération de maintenance créée.');
          this.showFormModal.set(false);
          this.load();
        },
        error: (err: unknown) => this.modalError.set(extractApiError(err)),
      });
  }

  private load(): void {
    this.loading.set(true);
    this.admin.getMaintenances().subscribe({
      next: maintenances => this.maintenances.set(maintenances),
      error: (err: unknown) => this.error.set(extractApiError(err)),
    });
    this.vehiclesService
      .getAllVehicules()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: vehicles => this.vehicles.set(vehicles),
        error: (err: unknown) => this.error.set(extractApiError(err)),
      });
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}

