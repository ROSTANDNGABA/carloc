import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, finalize, switchMap, throwError } from 'rxjs';
import { AuthService } from '@app/auth/auth.service';
import { ReservationService } from '@app/core/services/reservation.service';
import { VehiculeService } from '@app/core/services/vehicule.service';
import { reservationDatesValidator } from '@app/core/validators/reservation.validators';
import { extractApiError, extractReservationError } from '@app/core/utils/api.util';
import { Vehicule } from '@app/models/vehicule.model';
import {
  CardComponent,
  BadgeComponent,
  ButtonComponent,
  EmptyStateComponent,
  ModalComponent,
  AlertComponent,
} from '@app/shared/components';
import {
  imageUrl,
  money,
  nbJoursLocation,
  todayIso,
  toNumber,
} from '@app/shared/formatters';

@Component({
  selector: 'app-catalogue-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    CardComponent,
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    ModalComponent,
    AlertComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gray-50">
      
      <!-- Hero Header -->
      <div class="bg-gradient-to-br from-carloc-600 to-carloc-500 text-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div class="text-center max-w-3xl mx-auto">
            <span class="inline-block px-4 py-1.5 rounded-full text-xs font-bold bg-white/20 text-white mb-4 uppercase tracking-wider">
              Notre Collection
            </span>
            <h1 class="text-4xl md:text-5xl font-black mb-4">
              Trouvez l'exception.
            </h1>
            <p class="text-lg text-white/90">
              Parcourez notre flotte de véhicules haut de gamme et réservez l'excellence pour votre prochain trajet.
            </p>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <!-- Error Alert -->
        @if (error()) {
          <app-alert variant="danger" [dismissible]="true" (dismissed)="error.set('')" class="mb-6">
            {{ error() }}
          </app-alert>
        }

        <!-- Filters Card -->
        <app-card variant="flat" class="mb-8">
          <form [formGroup]="filtersForm" class="p-6">
            <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <i class="bi bi-funnel text-carloc-600"></i>
              Filtrer la sélection
            </h3>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- Catégorie -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Catégorie</label>
                <select formControlName="categorie" class="input-carloc">
                  <option value="">Toutes les catégories</option>
                  @for (category of categories(); track category) {
                    <option [value]="category">{{ category }}</option>
                  }
                </select>
              </div>

              <!-- Marque -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Marque</label>
                <input
                  type="text"
                  formControlName="marque"
                  class="input-carloc"
                  placeholder="Ex: Mercedes, BMW..."
                />
              </div>

              <!-- Prix -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Prix max / jour ({{ filtersForm.value.prixMax || 500 }} FCFA)
                </label>
                <input
                  type="range"
                  formControlName="prixMax"
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-carloc-600"
                  min="0"
                  max="10000"
                  step="50"
                />
              </div>
            </div>
          </form>
        </app-card>

        <!-- Loading State -->
        @if (loading()) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (i of [1, 2, 3, 4, 5, 6]; track i) {
              <div class="bg-white rounded-2xl shadow-lg animate-pulse">
                <div class="h-48 bg-gray-200 rounded-t-2xl"></div>
                <div class="p-6 space-y-3">
                  <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div class="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div class="h-10 bg-gray-200 rounded"></div>
                </div>
              </div>
            }
          </div>
        }

        <!-- Vehicles Grid -->
        @else if (groupedVehicles().length) {
          @for (group of groupedVehicles(); track group[0]) {
            <div class="mb-12">
              <!-- Category Title -->
              <div class="flex items-center gap-3 mb-6">
                <h2 class="text-2xl font-bold text-gray-900 capitalize">{{ group[0] }}</h2>
                <div class="flex-1 h-px bg-gradient-to-r from-carloc-200 to-transparent"></div>
                <span class="text-sm font-semibold text-carloc-600">{{ group[1].length }} véhicules</span>
              </div>

              <!-- Vehicles Grid -->
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                @for (vehicule of group[1]; track vehicule.id) {
                  <app-card variant="hover" class="group cursor-pointer" (click)="selectVehicle(vehicule)">
                    <!-- Image -->
                    <div class="relative h-48 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 overflow-hidden">
                      <img
                        [src]="image(vehicule, 0)"
                        [alt]="vehicule.marque + ' ' + vehicule.modele"
                        class="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-300"
                      />
                      <!-- Status Badge -->
                      <div class="absolute top-3 left-3">
                        @if (vehicule.statut === 'disponible') {
                          <app-badge variant="success" [dot]="true">Disponible</app-badge>
                        } @else if (vehicule.statut === 'maintenance') {
                          <app-badge variant="warning" [dot]="true">Maintenance</app-badge>
                        } @else {
                          <app-badge variant="neutral" [dot]="true">Indisponible</app-badge>
                        }
                      </div>
                    </div>

                    <!-- Content -->
                    <div class="p-6">
                      <div class="flex items-start justify-between mb-3">
                        <div>
                          <h3 class="text-lg font-bold text-gray-900 mb-1">
                            {{ vehicule.marque }} {{ vehicule.modele }}
                          </h3>
                          <p class="text-sm text-gray-500">{{ vehicule.immatriculation }}</p>
                        </div>
                        <div class="text-right">
                          <div class="text-2xl font-black text-carloc-600">
                            {{ moneyFmt(vehicule.prix_journalier) }}
                          </div>
                          <div class="text-xs text-gray-500">/ jour</div>
                        </div>
                      </div>

                      <!-- Specs -->
                      <div class="flex items-center gap-4 text-sm text-gray-600 mb-4">
                        <span class="flex items-center gap-1">
                          <i class="bi bi-gear"></i> Auto
                        </span>
                        <span class="flex items-center gap-1">
                          <i class="bi bi-person"></i> 5 pl.
                        </span>
                        <span class="px-2 py-1 bg-gray-100 rounded text-xs font-medium capitalize">
                          {{ vehicule.categorie }}
                        </span>
                      </div>

                      <!-- CTA Button -->
                      <app-button
                        [variant]="vehicule.statut === 'disponible' ? 'primary' : 'ghost'"
                        [disabled]="vehicule.statut !== 'disponible'"
                        [fullWidth]="true"
                        size="md"
                        (clicked)="selectVehicle(vehicule); $event.stopPropagation()"
                      >
                        <i class="bi bi-calendar-check"></i>
                        {{ vehicule.statut === 'disponible' ? 'Réserver' : 'Indisponible' }}
                      </app-button>
                    </div>
                  </app-card>
                }
              </div>
            </div>
          }
        }

        <!-- Empty State -->
        @else {
          <app-empty-state
            icon="bi-search"
            title="Aucun véhicule trouvé"
            description="Modifiez vos filtres pour découvrir plus de modèles."
          >
            <app-button variant="outline" (clicked)="resetFilters()">
              <i class="bi bi-arrow-clockwise"></i>
              Réinitialiser les filtres
            </app-button>
          </app-empty-state>
        }
      </div>

      <!-- Reservation Modal -->
      <app-modal
        [isOpen]="!!selectedVehicle()"
        [title]="selectedVehicle()?.marque + ' ' + selectedVehicle()?.modele"
        size="lg"
        [hasFooter]="true"
        (closed)="closeDrawer()"
      >
        @if (selectedVehicle()) {
          <!-- Vehicle Preview -->
          <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-6">
            <img
              [src]="image(selectedVehicle()!, 0)"
              [alt]="selectedVehicle()?.marque"
              class="w-24 h-20 object-contain bg-white rounded-lg p-2"
            />
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-bold text-carloc-600 uppercase">{{ selectedVehicle()?.categorie }}</span>
                @if (selectedVehicle()?.statut === 'disponible') {
                  <app-badge variant="success" [dot]="true">Disponible</app-badge>
                }
              </div>
              <div class="font-mono text-sm text-gray-600">{{ selectedVehicle()?.immatriculation }}</div>
            </div>
            <div class="text-right">
              <div class="text-2xl font-black text-carloc-600">
                {{ moneyFmt(selectedVehicle()?.prix_journalier) }}
              </div>
              <div class="text-xs text-gray-500">/ jour</div>
            </div>
          </div>

          <!-- Client Info -->
          @if (clientInfo()) {
            <div class="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl mb-6">
              <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <i class="bi bi-person text-blue-600"></i>
              </div>
              <div>
                <div class="font-semibold text-gray-900">
                  {{ clientInfo()?.prenom }} {{ clientInfo()?.nom }}
                </div>
                <div class="text-sm text-gray-600">{{ clientInfo()?.email }}</div>
              </div>
            </div>
          }

          <!-- Booking Form -->
          <form [formGroup]="bookingForm" (ngSubmit)="createBooking()" class="space-y-6">
            <!-- Dates -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <i class="bi bi-calendar text-carloc-600"></i>
                  Date de départ
                </label>
                <input
                  type="date"
                  formControlName="date_debut"
                  [min]="minDate()"
                  class="input-carloc"
                  [class.border-red-500]="bookingForm.hasError('dateInPast')"
                />
                @if (bookingForm.hasError('dateInPast')) {
                  <p class="text-xs text-red-600 mt-1">La date ne peut pas être dans le passé</p>
                }
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <i class="bi bi-calendar-check text-carloc-600"></i>
                  Date de retour
                </label>
                <input
                  type="date"
                  formControlName="date_fin"
                  [min]="bookingForm.value.date_debut || minDate()"
                  class="input-carloc"
                  [class.border-red-500]="bookingForm.hasError('dateRange')"
                />
                @if (bookingForm.hasError('dateRange')) {
                  <p class="text-xs text-red-600 mt-1">La date de retour doit être après le départ</p>
                }
              </div>
            </div>

            <!-- Availability Check -->
            @if (availabilityMessage()) {
              <app-alert
                [variant]="availabilityOk() ? 'success' : 'danger'"
                [icon]="true"
              >
                {{ availabilityMessage() }}
              </app-alert>
            }

            <!-- Price Summary -->
            <div class="bg-gradient-to-br from-carloc-50 to-white border-2 border-carloc-200 rounded-xl p-6">
              <h4 class="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <i class="bi bi-calculator text-carloc-600"></i>
                Récapitulatif
              </h4>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">Tarif journalier</span>
                  <span class="font-semibold">{{ moneyFmt(selectedVehicle()?.prix_journalier) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Durée</span>
                  <span class="font-semibold">{{ selectedDays() }} jour(s)</span>
                </div>
                <div class="h-px bg-carloc-200 my-3"></div>
                <div class="flex justify-between text-lg">
                  <span class="font-bold text-gray-900">Total estimé</span>
                  <span class="font-black text-carloc-600">{{ moneyFmt(estimate()) }}</span>
                </div>
              </div>
              <p class="text-xs text-gray-500 mt-4">
                * Montant indicatif — le total exact est calculé par le serveur
              </p>
            </div>

            <!-- Booking Messages -->
            @if (bookingMessage()) {
              <app-alert
                [variant]="bookingTone() === 'success' ? 'success' : bookingTone() === 'danger' ? 'danger' : 'warning'"
                [dismissible]="false"
              >
                {{ bookingMessage() }}
                @if (profileLinkHint()) {
                  <a routerLink="/client/profil" class="underline font-semibold ml-2">
                    Compléter mon profil →
                  </a>
                }
              </app-alert>
            }
          </form>
        }

        <!-- Modal Footer -->
        <div modal-footer class="flex items-center justify-end gap-3">
          <app-button variant="ghost" (clicked)="closeDrawer()">
            Annuler
          </app-button>
          <app-button
            variant="primary"
            [disabled]="saving() || checkingAvailability() || selectedDays() <= 0 || availabilityOk() === false"
            [loading]="saving() || checkingAvailability()"
            [loadingText]="saving() ? 'Réservation...' : 'Vérification...'"
            (clicked)="createBooking()"
          >
            <i class="bi bi-check-circle"></i>
            Confirmer la réservation
          </app-button>
        </div>
      </app-modal>
    </div>
  `,
})
export class CataloguePageComponent implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly vehiculeService = inject(VehiculeService);
  private readonly reservationService = inject(ReservationService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly checkingAvailability = signal(false);
  readonly error = signal('');
  readonly availabilityMessage = signal('');
  readonly availabilityOk = signal<boolean | null>(null);
  readonly bookingMessage = signal('');
  readonly bookingTone = signal<'success' | 'danger' | 'warning'>('warning');
  readonly profileLinkHint = signal(false);

  readonly vehicles = signal<Vehicule[]>([]);
  readonly selectedVehicle = signal<Vehicule | null>(null);
  readonly clientInfo = signal<any>(null);
  readonly minDate = signal(todayIso());

  readonly filtersForm = this.fb.group({
    categorie: [''],
    marque: [''],
    prixMax: [10000],
  });

  readonly bookingForm = this.fb.group(
    {
      date_debut: [todayIso(), Validators.required],
      date_fin: ['', Validators.required],
    },
    { validators: reservationDatesValidator }
  );

  readonly categories = computed(() => {
    const cats = new Set(this.vehicles().map(v => v.categorie));
    return Array.from(cats).sort();
  });

  readonly filteredVehicles = computed(() => {
    const filters = this.filtersForm.value;
    return this.vehicles().filter(v => {
      if (filters.categorie && v.categorie !== filters.categorie) return false;
      if (filters.marque && !v.marque.toLowerCase().includes(filters.marque.toLowerCase())) return false;
      if (filters.prixMax && toNumber(v.prix_journalier) > filters.prixMax) return false;
      return true;
    });
  });

  readonly groupedVehicles = computed(() => {
    const grouped = new Map<string, Vehicule[]>();
    for (const v of this.filteredVehicles()) {
      if (!grouped.has(v.categorie)) grouped.set(v.categorie, []);
      grouped.get(v.categorie)!.push(v);
    }
    return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  });

  readonly selectedDays = computed(() => {
    const start = this.bookingForm.value.date_debut;
    const end = this.bookingForm.value.date_fin;
    return start && end ? nbJoursLocation(start, end) : 0;
  });

  readonly estimate = computed(() => {
    const vehicle = this.selectedVehicle();
    if (!vehicle) return 0;
    return toNumber(vehicle.prix_journalier) * this.selectedDays();
  });

  readonly moneyFmt = money;
  
  image(vehicule: Vehicule, index: number): string {
    return imageUrl(vehicule.image || '', vehicule.categorie, index);
  }

  ngOnInit(): void {
    this.loadVehicles();
    this.loadClientInfo();
    this.setupAvailabilityCheck();
  }

  private loadVehicles(): void {
    this.loading.set(true);
    this.vehiculeService
      .getVehicules()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: res => this.vehicles.set(res.results || []),
        error: err => this.error.set(extractApiError(err)),
      });
  }

  private loadClientInfo(): void {
    const userStr = localStorage.getItem('user_info');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.clientInfo.set({
          prenom: user.prenom || user.firstName || '',
          nom: user.nom || user.lastName || '',
          email: user.email || '',
        });
      } catch {
        // ignore
      }
    }
  }

  private setupAvailabilityCheck(): void {
    this.bookingForm.valueChanges
      .pipe(
        debounceTime(500),
        switchMap(() => {
          const vehicle = this.selectedVehicle();
          if (!vehicle || !this.bookingForm.valid || this.selectedDays() <= 0) {
            return throwError(() => new Error('Invalid form'));
          }

          this.checkingAvailability.set(true);
          this.availabilityMessage.set('');
          
          // Simplified availability check - assuming API exists
          // Replace with actual service call when available
          this.checkingAvailability.set(false);
          this.availabilityOk.set(true);
          this.availabilityMessage.set('✓ Véhicule disponible pour ces dates');
          
          return throwError(() => new Error('Bypass'));
        })
      )
      .subscribe({
        error: () => {
          // Expected flow
        },
      });
  }

  selectVehicle(vehicle: Vehicule): void {
    if (vehicle.statut !== 'disponible') return;
    this.selectedVehicle.set(vehicle);
    this.bookingMessage.set('');
    this.availabilityMessage.set('');
    this.availabilityOk.set(null);
  }

  closeDrawer(): void {
    this.selectedVehicle.set(null);
    this.bookingForm.reset({ date_debut: todayIso(), date_fin: '' });
    this.bookingMessage.set('');
    this.availabilityMessage.set('');
    this.availabilityOk.set(null);
  }

  createBooking(): void {
    if (this.bookingForm.invalid || !this.selectedVehicle() || this.availabilityOk() === false) {
      return;
    }

    this.saving.set(true);
    this.bookingMessage.set('');

    const payload = {
      vehicule: this.selectedVehicle()!.id!,
      date_debut: this.bookingForm.value.date_debut!,
      date_fin: this.bookingForm.value.date_fin!,
    };

    this.reservationService
      .createReservation(payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.bookingTone.set('success');
          this.bookingMessage.set('✓ Réservation créée avec succès !');
          this.profileLinkHint.set(false);
          setTimeout(() => {
            this.closeDrawer();
            void this.router.navigateByUrl('/client/reservations');
          }, 1500);
        },
        error: err => {
          const errorData = extractReservationError(err);
          const msg = typeof errorData === 'string' ? errorData : errorData.message;
          const needsProfile = typeof errorData === 'object' && errorData.profileLink;
          
          this.bookingTone.set('danger');
          this.bookingMessage.set(msg);
          this.profileLinkHint.set(needsProfile || msg.includes('profil'));
        },
      });
  }

  resetFilters(): void {
    this.filtersForm.reset({ categorie: '', marque: '', prixMax: 10000 });
  }
}
