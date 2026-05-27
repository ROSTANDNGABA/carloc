import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { VehiculeService } from '@app/core/services/vehicule.service';
import { extractApiError } from '@app/core/utils/api.util';
import { Vehicule } from '@app/models/vehicule.model';
import { imageUrl, money, statusLabel, statusTone } from '@app/shared/formatters';
import { EMPTY_VEHICULE_FORM, VehiculeFormValue } from '../vehicule-form/vehicule-form.model';

@Component({
  selector: 'app-admin-vehicles-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="admin-page">
      <div class="section-heading">
        <div>
          <p class="eyebrow">{{ totalCount() }} véhicules</p>
          <h2>Flotte de véhicules</h2>
        </div>
        <div class="section-actions">
          <button class="btn btn-primary" type="button" (click)="openCreateModal()">
            <i class="bi bi-plus-lg" aria-hidden="true"></i>
            Nouveau véhicule
          </button>
        </div>
      </div>

      @if (message()) {
        <div class="alert-banner success">{{ message() }}</div>
      }
      @if (error()) {
        <div class="alert-banner danger">{{ error() }}</div>
      }

      <section class="surface-panel list-panel admin-vehicle-list" style="margin-top: 1.5rem;">
        <div class="panel-heading" style="display:flex;flex-wrap:wrap;gap:1rem;align-items:center;justify-content:space-between;">
          <h3>Véhicules enregistrés</h3>
          <div style="display:flex;gap:0.5rem;">
            <input class="form-control" type="search" placeholder="Rechercher…" [value]="searchTerm()" (input)="searchTerm.set($any($event.target).value)" (keyup.enter)="applySearch()" />
            <button class="btn btn-outline-secondary" type="button" (click)="applySearch()">Rechercher</button>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; padding: 0.5rem 0;">
          @if (loading()) {
            <div class="skeleton-card tall" style="grid-column: 1 / -1;"></div>
          } @else {
            @for (vehicle of vehicles(); track vehicle.id ?? vehicle.immatriculation; let i = $index) {
              <article class="vehicle-admin-item" style="display: flex; gap: 1rem; padding: 1rem; border: 1px solid var(--carloc-border); border-radius: var(--carloc-radius-md); background: var(--carloc-surface); box-shadow: var(--carloc-shadow-sm); position: relative;">
                <img [src]="image(vehicle, i)" [alt]="vehicle.marque + ' ' + vehicle.modele" style="width: 100px; height: 100px; object-fit: cover; border-radius: var(--carloc-radius-sm); border: 1px solid var(--carloc-border);" />
                <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <span [class]="'status-pill ' + tone(vehicle.statut)" style="margin-bottom: 0.25rem;">{{ label(vehicle.statut) }}</span>
                    <h3 style="margin: 0.25rem 0; font-size: 1.1rem; font-weight: 700; color: var(--carloc-heading);">{{ vehicle.marque }} {{ vehicle.modele }}</h3>
                    <p style="margin: 0; font-size: 0.85rem; color: var(--carloc-text-muted);">{{ vehicle.immatriculation }} · {{ vehicle.categorie }}</p>
                  </div>
                  <strong style="display: block; margin-top: 0.5rem; color: var(--carloc-primary); font-size: 1rem;">{{ moneyFmt(vehicle.prix_journalier) }} / jour</strong>
                </div>
                <div class="item-actions" style="display: flex; flex-direction: column; gap: 0.5rem; justify-content: center;">
                  <button class="btn btn-icon" type="button" (click)="edit(vehicle)" aria-label="Modifier" style="background: var(--carloc-surface-muted);">
                    <i class="bi bi-pencil" aria-hidden="true"></i>
                  </button>
                  <button class="btn btn-icon danger" type="button" (click)="askRemove(vehicle)" aria-label="Supprimer" style="background: var(--carloc-surface-muted);">
                    <i class="bi bi-trash" aria-hidden="true"></i>
                  </button>
                </div>
              </article>
            } @empty {
              <div class="empty-state" style="grid-column: 1 / -1; padding: 4rem 2rem; text-align: center;">
                <i class="bi bi-car-front" aria-hidden="true" style="font-size: 3rem; color: var(--carloc-text-muted);"></i>
                <h3 style="margin-top: 1rem; color: var(--carloc-heading);">Aucun véhicule</h3>
                <p style="color: var(--carloc-text-muted);">Ajoutez le premier véhicule de la flotte.</p>
              </div>
            }
          }
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
              <h3>{{ editingId() ? 'Modifier le véhicule' : 'Nouveau véhicule' }}</h3>
              <button class="modal-close-btn" type="button" (click)="closeFormModal()" aria-label="Fermer">
                <i class="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </div>
            <form [formGroup]="vehicleForm" (ngSubmit)="save()" class="stack-form" style="margin: 0;">
              <div class="modal-body">
                <label>
                  <span>Immatriculation</span>
                  <input type="text" formControlName="immatriculation" placeholder="Ex: AA-123-BB" />
                </label>
                <div class="form-grid two">
                  <label>
                    <span>Marque</span>
                    <input type="text" formControlName="marque" placeholder="Ex: Peugeot" />
                  </label>
                  <label>
                    <span>Modèle</span>
                    <input type="text" formControlName="modele" placeholder="Ex: 208" />
                  </label>
                </div>
                <div class="form-grid two">
                  <label>
                    <span>Catégorie</span>
                    <input type="text" formControlName="categorie" placeholder="Ex: Citadine" />
                  </label>
                  <label>
                    <span>Prix journalier</span>
                    <input type="number" formControlName="prix_journalier" min="1" placeholder="Ex: 45" />
                  </label>
                </div>
                <label>
                  <span>Statut</span>
                  <select formControlName="statut">
                    <option value="disponible">Disponible</option>
                    <option value="loue">Loué</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </label>
                <label>
                  <span>Image du véhicule</span>
                  <input type="file" accept="image/*" (change)="onImageChange($event)" />
                </label>
              </div>
              <div class="modal-footer">
                <button class="btn btn-quiet" type="button" (click)="closeFormModal()">Annuler</button>
                <button class="btn btn-primary" type="submit" [disabled]="vehicleForm.invalid || saving()">
                  <i class="bi bi-save" aria-hidden="true"></i>
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (showDeleteModal()) {
        <div class="modal-overlay" (click)="closeDeleteModal()">
          <div class="modal-container narrow" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Suppression</h3>
              <button class="modal-close-btn" type="button" (click)="closeDeleteModal()" aria-label="Fermer">
                <i class="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </div>
            <div class="modal-body">
              <div class="modal-confirm-content">
                <i class="bi bi-exclamation-triangle modal-confirm-icon" aria-hidden="true" style="color: var(--carloc-primary);"></i>
                <h4>Supprimer ce véhicule ?</h4>
                <p>Êtes-vous sûr de vouloir supprimer le véhicule <strong>{{ vehicleToDelete()?.marque }} {{ vehicleToDelete()?.modele }}</strong> ({{ vehicleToDelete()?.immatriculation }}) ? Cette action est irréversible.</p>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-quiet" type="button" (click)="closeDeleteModal()">Annuler</button>
              <button class="btn btn-primary" type="button" (click)="confirmDelete()" style="background-color: var(--carloc-primary);">
                <i class="bi bi-trash" aria-hidden="true"></i>
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
})
export class AdminVehiclesPageComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly vehiclesService = inject(VehiculeService);

  readonly vehicles = signal<Vehicule[]>([]);
  readonly totalCount = signal(0);
  readonly page = signal(1);
  readonly searchTerm = signal('');
  readonly hasNext = signal(false);
  readonly hasPrevious = signal(false);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly selectedImage = signal<File | null>(null);
  readonly error = signal('');
  readonly message = signal('');

  readonly showFormModal = signal(false);
  readonly showDeleteModal = signal(false);
  readonly vehicleToDelete = signal<Vehicule | null>(null);

  readonly vehicleForm = this.fb.group({
    immatriculation: [EMPTY_VEHICULE_FORM.immatriculation, Validators.required],
    marque: [EMPTY_VEHICULE_FORM.marque, Validators.required],
    modele: [EMPTY_VEHICULE_FORM.modele, Validators.required],
    categorie: [EMPTY_VEHICULE_FORM.categorie, Validators.required],
    prix_journalier: [EMPTY_VEHICULE_FORM.prix_journalier, [Validators.required, Validators.min(1)]],
    statut: [EMPTY_VEHICULE_FORM.statut, Validators.required],
  });

  readonly moneyFmt = money;
  readonly label = statusLabel;
  readonly tone = statusTone;

  constructor() {
    this.load();
  }

  image(vehicle: Vehicule, index: number): string {
    return imageUrl(vehicle.image, vehicle.categorie, index);
  }

  openCreateModal(): void {
    this.resetForm();
    this.showFormModal.set(true);
  }

  closeFormModal(): void {
    this.showFormModal.set(false);
    this.resetForm();
  }

  edit(vehicle: Vehicule): void {
    this.editingId.set(vehicle.id ?? null);
    this.vehicleForm.patchValue({
      immatriculation: vehicle.immatriculation,
      marque: vehicle.marque,
      modele: vehicle.modele,
      categorie: vehicle.categorie,
      prix_journalier: Number(vehicle.prix_journalier),
      statut: vehicle.statut,
    });
    this.showFormModal.set(true);
  }

  resetForm(): void {
    this.editingId.set(null);
    this.selectedImage.set(null);
    this.vehicleForm.reset(EMPTY_VEHICULE_FORM);
  }

  save(): void {
    if (this.vehicleForm.invalid) return;

    const values: VehiculeFormValue = this.vehicleForm.getRawValue() as VehiculeFormValue;
    const payload = new FormData();
    payload.append('immatriculation', values.immatriculation);
    payload.append('marque', values.marque);
    payload.append('modele', values.modele);
    payload.append('categorie', values.categorie);
    payload.append('prix_journalier', String(Number(values.prix_journalier)));
    payload.append('statut', values.statut);
    const image = this.selectedImage();
    if (image) {
      payload.append('image', image);
    }
    const id = this.editingId();
    const request = id
      ? this.vehiclesService.updateVehicule(id, payload)
      : this.vehiclesService.createVehicule(payload);

    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.message.set(id ? 'Véhicule mis à jour.' : 'Véhicule créé.');
        this.closeFormModal();
        if (!id) {
          this.page.set(1);
          this.searchTerm.set('');
        }
        this.load();
      },
      error: (err: unknown) => this.error.set(extractApiError(err)),
    });
  }

  askRemove(vehicle: Vehicule): void {
    this.vehicleToDelete.set(vehicle);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.vehicleToDelete.set(null);
  }

  confirmDelete(): void {
    const vehicle = this.vehicleToDelete();
    if (!vehicle || !vehicle.id) return;
    this.error.set('');
    this.message.set('');
    this.vehiclesService.deleteVehicule(vehicle.id).subscribe({
      next: () => {
        this.message.set('Véhicule supprimé.');
        this.closeDeleteModal();
        this.load();
      },
      error: (err: unknown) => this.error.set(extractApiError(err)),
    });
  }

  onImageChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedImage.set(input.files?.[0] ?? null);
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
    this.vehiclesService
      .getVehicules(this.page(), this.searchTerm())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: res => {
          this.vehicles.set(res.results ?? []);
          this.totalCount.set(res.count ?? 0);
          this.hasNext.set(!!res.next);
          this.hasPrevious.set(!!res.previous);
        },
        error: (err: unknown) => this.error.set(extractApiError(err)),
      });
  }
}
