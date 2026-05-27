import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ClientHistorique, ClientService } from '@app/core/services/client.service';
import { permisValidator, telephoneValidator } from '@app/core/validators/carloc.validators';
import { extractApiError } from '@app/core/utils/api.util';
import { Client } from '@app/models/client.model';
import { clientName, money, shortDate } from '@app/shared/formatters';

@Component({
  selector: 'app-admin-clients-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="admin-page">
      <div class="section-heading">
        <div>
          <p class="eyebrow">{{ totalCount() }} clients</p>
          <h2>Portefeuille client</h2>
        </div>
        <div class="section-actions">
          <button class="btn btn-primary" type="button" (click)="openCreateModal()">
            <i class="bi bi-person-plus" aria-hidden="true"></i>
            Nouveau client
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
          <h3>Liste des clients</h3>
          <div style="display:flex;gap:0.5rem;align-items:center;">
            <input class="form-control" type="search" placeholder="Rechercher…" [value]="searchTerm()" (input)="searchTerm.set($any($event.target).value)" (keyup.enter)="applySearch()" />
            <button class="btn btn-outline-secondary" type="button" (click)="applySearch()">Rechercher</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th>Permis</th>
                <th class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                <tr><td colspan="5" class="muted-cell">Chargement...</td></tr>
              } @else {
                @for (client of clients(); track client.id) {
                  <tr>
                    <td><strong>{{ clientNameFmt(client.nom, client.prenom) }}</strong></td>
                    <td>{{ client.email }}</td>
                    <td>{{ client.telephone }}</td>
                    <td>{{ client.num_permis }}</td>
                    <td class="text-end">
                      <button class="btn btn-icon" type="button" (click)="edit(client)" aria-label="Modifier" style="background: var(--carloc-surface-muted);">
                        <i class="bi bi-pencil" aria-hidden="true"></i>
                      </button>
                      <button class="btn btn-icon" type="button" (click)="openHistory(client)" aria-label="Historique" style="background: var(--carloc-surface-muted); margin-left: 0.5rem;">
                        <i class="bi bi-clock-history" aria-hidden="true"></i>
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="muted-cell">Aucun client.</td></tr>
                }
              }
            </tbody>
          </table>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:1rem 1.25rem;border-top:1px solid var(--carloc-border);">
          <button class="btn btn-outline-secondary btn-sm" type="button" [disabled]="!hasPrevious() || loading()" (click)="goPage(page() - 1)">Précédent</button>
          <span class="muted-cell">Page {{ page() }}</span>
          <button class="btn btn-outline-secondary btn-sm" type="button" [disabled]="!hasNext() || loading()" (click)="goPage(page() + 1)">Suivant</button>
        </div>
      </section>

      <!-- Formulaire Client Modal -->
      @if (showFormModal()) {
        <div class="modal-overlay" (click)="closeFormModal()">
          <div class="modal-container" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editingId() ? 'Modifier le client' : 'Nouveau client' }}</h3>
              <button class="modal-close-btn" type="button" (click)="closeFormModal()" aria-label="Fermer">
                <i class="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </div>
            <form [formGroup]="clientForm" (ngSubmit)="save()" class="stack-form" style="margin: 0;">
              <div class="modal-body">
                <div class="form-grid two">
                  <label>
                    <span>Nom</span>
                    <input type="text" formControlName="nom" placeholder="Ex: Dupont" />
                  </label>
                  <label>
                    <span>Prénom</span>
                    <input type="text" formControlName="prenom" placeholder="Ex: Jean" />
                  </label>
                </div>
                <label>
                  <span>Email</span>
                  <input type="email" formControlName="email" placeholder="Ex: jean.dupont@mail.com" />
                </label>
                <div class="form-grid two">
                  <label>
                    <span>Téléphone</span>
                    <input type="tel" formControlName="telephone" placeholder="Ex: +33 6 12 34 56 78" />
                  </label>
                  <label>
                    <span>Permis</span>
                    <input type="text" formControlName="num_permis" placeholder="Ex: 15AA99999" />
                  </label>
                </div>
                @if (!editingId()) {
                  <div class="form-grid two">
                    <label>
                      <span>Mot de passe</span>
                      <input type="password" formControlName="password" placeholder="Min. 8 caractères" />
                    </label>
                    <label>
                      <span>Confirmation</span>
                      <input type="password" formControlName="password_confirm" placeholder="Confirmer le mot de passe" />
                    </label>
                  </div>
                }
              </div>
              <div class="modal-footer">
                <button class="btn btn-quiet" type="button" (click)="closeFormModal()">Annuler</button>
                <button class="btn btn-primary" type="submit" [disabled]="clientForm.invalid || saving()">
                  <i class="bi bi-save" aria-hidden="true"></i>
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Historique Client Modal -->
      @if (history(); as hist) {
        <div class="modal-overlay" (click)="history.set(null)">
          <div class="modal-container" (click)="$event.stopPropagation()" style="max-width: 720px;">
            <div class="modal-header">
              <h3>Historique de {{ hist.client.prenom }} {{ hist.client.nom }}</h3>
              <button class="modal-close-btn" type="button" (click)="history.set(null)" aria-label="Fermer">
                <i class="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </div>
            <div class="modal-body">
              <div class="chart-summary-grid" style="grid-template-columns: repeat(4, 1fr); margin-top: 0; padding-top: 0; border: none; margin-bottom: 1.5rem;">
                <div class="chart-summary-item" style="background: var(--carloc-surface-muted); padding: 0.75rem; border-radius: var(--carloc-radius-sm); text-align: center; border: 1px solid var(--carloc-border);">
                  <span>Réservations</span>
                  <strong>{{ hist.resume.nb_reservations }}</strong>
                </div>
                <div class="chart-summary-item" style="background: var(--carloc-surface-muted); padding: 0.75rem; border-radius: var(--carloc-radius-sm); text-align: center; border: 1px solid var(--carloc-border);">
                  <span>Paiements</span>
                  <strong>{{ hist.resume.nb_paiements }}</strong>
                </div>
                <div class="chart-summary-item" style="background: var(--carloc-surface-muted); padding: 0.75rem; border-radius: var(--carloc-radius-sm); text-align: center; border: 1px solid var(--carloc-border);">
                  <span>Dépensé</span>
                  <strong>{{ moneyFmt(hist.resume.total_depense) }}</strong>
                </div>
                <div class="chart-summary-item" style="background: rgba(245, 158, 11, 0.08); padding: 0.75rem; border-radius: var(--carloc-radius-sm); text-align: center; border: 1px solid rgba(245, 158, 11, 0.2);">
                  <span style="color: #d97706;">Solde dû</span>
                  <strong style="color: #d97706;">{{ moneyFmt(hist.resume.solde_impaye) }}</strong>
                </div>
              </div>

              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Véhicule</th>
                      <th>Période</th>
                      <th>Montant</th>
                      <th>Solde</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (reservation of hist.reservations; track reservation.id) {
                      <tr>
                        <td>{{ reservation.vehicule }}</td>
                        <td>{{ dateFmt(reservation.date_debut) }} - {{ dateFmt(reservation.date_fin) }}</td>
                        <td>{{ moneyFmt(reservation.montant_du) }}</td>
                        <td>{{ moneyFmt(reservation.solde_restant) }}</td>
                      </tr>
                    } @empty {
                      <tr><td colspan="4" class="muted-cell">Aucun historique.</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-primary" type="button" (click)="history.set(null)">Fermer</button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
})
export class AdminClientsPageComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly clientsService = inject(ClientService);

  readonly clients = signal<Client[]>([]);
  readonly totalCount = signal(0);
  readonly page = signal(1);
  readonly searchTerm = signal('');
  readonly hasNext = signal(false);
  readonly hasPrevious = signal(false);
  readonly history = signal<ClientHistorique | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly error = signal('');
  readonly message = signal('');

  readonly showFormModal = signal(false);

  readonly clientForm = this.fb.group({
    nom: ['', Validators.required],
    prenom: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telephone: ['', [Validators.required, telephoneValidator()]],
    num_permis: ['', [Validators.required, permisValidator()]],
    password: [''],
    password_confirm: [''],
  });

  readonly clientNameFmt = clientName;
  readonly moneyFmt = money;
  readonly dateFmt = shortDate;

  constructor() {
    this.load();
  }

  openCreateModal(): void {
    this.resetForm();
    this.showFormModal.set(true);
  }

  closeFormModal(): void {
    this.showFormModal.set(false);
    this.resetForm();
  }

  edit(client: Client): void {
    this.editingId.set(client.id ?? null);
    this.clientForm.patchValue({
      nom: client.nom,
      prenom: client.prenom,
      email: client.email,
      telephone: client.telephone,
      num_permis: client.num_permis,
      password: '',
      password_confirm: '',
    });
    this.showFormModal.set(true);
  }

  resetForm(): void {
    this.editingId.set(null);
    this.clientForm.reset({
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      num_permis: '',
      password: '',
      password_confirm: '',
    });
  }

  save(): void {
    if (this.clientForm.invalid) return;
    const values = this.clientForm.getRawValue();
    const id = this.editingId();

    if (!id && (values.password.length < 8 || values.password !== values.password_confirm)) {
      this.error.set('Le mot de passe doit contenir 8 caractères et correspondre à la confirmation.');
      return;
    }

    const payload: Record<string, unknown> = {
      nom: values.nom,
      prenom: values.prenom,
      email: values.email,
      telephone: values.telephone,
      num_permis: values.num_permis,
    };
    if (!id) {
      payload['password'] = values.password;
      payload['password_confirm'] = values.password_confirm;
    }

    const request = id
      ? this.clientsService.updateClient(id, payload as Partial<Client>)
      : this.clientsService.createClient(payload);

    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.message.set(id ? 'Client mis à jour.' : 'Client créé.');
        this.closeFormModal();
        this.load();
      },
      error: (err: unknown) => this.error.set(extractApiError(err)),
    });
  }

  openHistory(client: Client): void {
    if (!client.id) return;
    this.error.set('');
    this.clientsService.getHistorique(client.id).subscribe({
      next: history => this.history.set(history),
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
    this.clientsService
      .getClients(this.page(), this.searchTerm())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: res => {
          this.clients.set(res.results ?? []);
          this.totalCount.set(res.count ?? 0);
          this.hasNext.set(!!res.next);
          this.hasPrevious.set(!!res.previous);
        },
        error: (err: unknown) => this.error.set(extractApiError(err)),
      });
  }
}
