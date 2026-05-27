import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  AdminService,
  Gestionnaire,
  GestionnairePayload,
} from '@app/core/services/admin.service';
import { extractApiError } from '@app/core/utils/api.util';
import { money, shortDate } from '@app/shared/formatters';

@Component({
  selector: 'app-admin-gestionnaires-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="admin-page">
      <div class="content-grid two">
        <section class="surface-panel">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Comptes internes</p>
              <h3>{{ selected() ? 'Modifier le gestionnaire' : 'Créer un gestionnaire' }}</h3>
            </div>
          </div>

          @if (error()) {
            <div class="alert-banner danger">{{ error() }}</div>
          }

          <form [formGroup]="form" (ngSubmit)="save()" class="form-grid">
            <label>
              <span>Nom utilisateur</span>
              <input formControlName="username" type="text" autocomplete="username" />
            </label>
            <label>
              <span>Email</span>
              <input formControlName="email" type="email" autocomplete="email" />
            </label>
            <label>
              <span>Prénom</span>
              <input formControlName="first_name" type="text" />
            </label>
            <label>
              <span>Nom</span>
              <input formControlName="last_name" type="text" />
            </label>
            <label>
              <span>Mot de passe</span>
              <input formControlName="password" type="password" autocomplete="new-password" />
            </label>
            <label class="check-row">
              <input formControlName="is_active" type="checkbox" />
              <span>Compte actif</span>
            </label>

            <div class="form-actions">
              <button class="btn btn-primary" type="submit" [disabled]="form.invalid || saving()">
                <i class="bi bi-save" aria-hidden="true"></i>
                {{ saving() ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
              <button class="btn btn-quiet" type="button" (click)="resetForm()">
                <i class="bi bi-plus-circle" aria-hidden="true"></i>
                Nouveau
              </button>
            </div>
          </form>
        </section>

        <section class="surface-panel">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Performance</p>
              <h3>Chiffre d'affaires par gestionnaire</h3>
            </div>
          </div>

          <div class="manager-bars">
            @for (manager of gestionnaires(); track manager.id) {
              <button type="button" class="manager-bar" (click)="edit(manager)">
                <span>
                  <strong>{{ displayName(manager) }}</strong>
                  <small>{{ manager.locations_realisees ?? 0 }} locations</small>
                </span>
                <span>{{ moneyFmt(manager.chiffre_affaires ?? 0) }}</span>
              </button>
            } @empty {
              <p class="muted-cell">Aucun gestionnaire pour le moment.</p>
            }
          </div>
        </section>
      </div>

      <section class="surface-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Historique</p>
            <h3>Locations réalisées</h3>
          </div>
          <button class="btn btn-quiet" type="button" (click)="load()">
            <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
            Actualiser
          </button>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Gestionnaire</th>
                <th>Client</th>
                <th>Véhicule</th>
                <th>Période</th>
                <th>Montant</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (manager of gestionnaires(); track manager.id) {
                @for (location of manager.historique_locations ?? []; track location.id) {
                  <tr>
                    <td>{{ displayName(manager) }}</td>
                    <td>{{ location.client }}</td>
                    <td>{{ location.vehicule }}</td>
                    <td>{{ dateFmt(location.date_debut) }} - {{ dateFmt(location.date_fin) }}</td>
                    <td>{{ moneyFmt(location.total_paye || location.montant_total) }}</td>
                    <td>
                      <span [class]="location.est_annulee ? 'status-pill tone-danger' : 'status-pill tone-success'">
                        {{ location.est_annulee ? 'Annulée' : 'Active' }}
                      </span>
                    </td>
                    <td>
                      <button class="btn btn-sm btn-quiet" type="button" (click)="edit(manager)">
                        <i class="bi bi-pencil" aria-hidden="true"></i>
                      </button>
                    </td>
                  </tr>
                }
              } @empty {
                <tr><td colspan="7" class="muted-cell">Aucun historique disponible.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="surface-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Liste</p>
            <h3>Gestionnaires</h3>
          </div>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>CA</th>
                <th>Locations</th>
                <th>Compte</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (manager of gestionnaires(); track manager.id) {
                <tr>
                  <td><strong>{{ displayName(manager) }}</strong></td>
                  <td>{{ manager.email }}</td>
                  <td>{{ moneyFmt(manager.chiffre_affaires ?? 0) }}</td>
                  <td>{{ manager.locations_realisees ?? 0 }}</td>
                  <td>
                    <span [class]="manager.is_active ? 'status-pill tone-success' : 'status-pill tone-muted'">
                      {{ manager.is_active ? 'Actif' : 'Désactivé' }}
                    </span>
                  </td>
                  <td class="row-actions">
                    <button class="btn btn-sm btn-quiet" type="button" (click)="edit(manager)">
                      <i class="bi bi-pencil" aria-hidden="true"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" type="button" (click)="remove(manager)">
                      <i class="bi bi-trash" aria-hidden="true"></i>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </section>
  `,
  styles: [`
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
    }
    .form-grid label {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-weight: 700;
      color: var(--carloc-heading);
    }
    .form-grid input {
      min-height: 42px;
    }
    .check-row {
      flex-direction: row !important;
      align-items: center;
      gap: 0.75rem !important;
    }
    .check-row input {
      min-height: auto;
      width: 18px;
      height: 18px;
    }
    .form-actions {
      grid-column: 1 / -1;
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .manager-bars {
      display: grid;
      gap: 0.75rem;
    }
    .manager-bar {
      border: 1px solid var(--carloc-border);
      background: var(--carloc-surface);
      color: var(--carloc-text);
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      text-align: left;
      cursor: pointer;
    }
    .manager-bar small {
      display: block;
      color: var(--carloc-text-muted);
      margin-top: 0.25rem;
    }
    .row-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }
    @media (max-width: 800px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class AdminGestionnairesPageComponent {
  private readonly admin = inject(AdminService);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly gestionnaires = signal<Gestionnaire[]>([]);
  readonly selected = signal<Gestionnaire | null>(null);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly moneyFmt = money;
  readonly dateFmt = shortDate;

  readonly form = this.fb.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    first_name: [''],
    last_name: [''],
    password: ['', Validators.minLength(8)],
    is_active: [true],
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.error.set('');
    this.admin.getGestionnairesStats().subscribe({
      next: data => this.gestionnaires.set(data),
      error: err => this.error.set(extractApiError(err)),
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.cleanPayload();
    const selected = this.selected();
    this.saving.set(true);
    this.error.set('');

    const request = selected
      ? this.admin.updateGestionnaire(selected.id, payload)
      : this.admin.createGestionnaire(payload as GestionnairePayload);

    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.resetForm();
        this.load();
      },
      error: err => this.error.set(extractApiError(err)),
    });
  }

  edit(manager: Gestionnaire): void {
    this.selected.set(manager);
    this.form.reset({
      username: manager.username,
      email: manager.email,
      first_name: manager.first_name ?? '',
      last_name: manager.last_name ?? '',
      password: '',
      is_active: manager.is_active,
    });
  }

  remove(manager: Gestionnaire): void {
    if (!confirm(`Désactiver le compte de ${this.displayName(manager)} ?`)) {
      return;
    }
    this.admin.deleteGestionnaire(manager.id).subscribe({
      next: () => this.load(),
      error: err => this.error.set(extractApiError(err)),
    });
  }

  resetForm(): void {
    this.selected.set(null);
    this.form.reset({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      password: '',
      is_active: true,
    });
  }

  displayName(manager: Gestionnaire): string {
    const fullName = `${manager.first_name ?? ''} ${manager.last_name ?? ''}`.trim();
    return fullName || manager.username;
  }

  private cleanPayload(): Partial<GestionnairePayload> {
    const raw = this.form.getRawValue();
    const payload: Partial<GestionnairePayload> = {
      username: raw.username.trim(),
      email: raw.email.trim(),
      first_name: raw.first_name.trim(),
      last_name: raw.last_name.trim(),
      is_active: raw.is_active,
    };
    if (raw.password.trim()) {
      payload.password = raw.password.trim();
    }
    return payload;
  }
}
