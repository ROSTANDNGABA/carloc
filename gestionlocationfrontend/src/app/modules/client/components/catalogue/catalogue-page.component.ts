import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, finalize, switchMap } from 'rxjs';
import { AuthService } from '@app/auth/auth.service';
import { ReservationService } from '@app/core/services/reservation.service';
import { VehiculeService } from '@app/core/services/vehicule.service';
import { reservationDatesValidator } from '@app/core/validators/reservation.validators';
import { extractApiError, extractReservationError } from '@app/core/utils/api.util';
import { Vehicule } from '@app/models/vehicule.model';
import {
  imageUrl,
  money,
  nbJoursLocation,
  statusLabel,
  statusTone,
  todayIso,
  toNumber,
} from '@app/shared/formatters';

@Component({
  selector: 'app-catalogue-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
  <div class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
    <div>
      <h1 class="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Catalogue</h1>
      <p class="text-gray-500 dark:text-gray-400 mt-1">Choisissez un véhicule disponible et réservez en quelques clics.</p>
    </div>
    <div class="text-sm font-semibold text-gray-500 dark:text-gray-400">
      {{ filteredVehicles().length }} véhicule(s) affiché(s)
    </div>
  </div>

  @if (error()) {
    <div class="rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-red-700 dark:text-red-300 font-medium">
      {{ error() }}
    </div>
  }

  <section class="rounded-lg bg-white dark:bg-carloc-900 border border-gray-200 dark:border-carloc-800 p-4 sm:p-5">
    <form [formGroup]="filtersForm" class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <label class="space-y-1 md:col-span-1">
        <span class="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Catégorie</span>
        <select formControlName="categorie" class="w-full rounded-lg border border-gray-200 dark:border-carloc-700 bg-gray-50 dark:bg-carloc-800 px-3 py-2.5 text-gray-900 dark:text-white outline-none focus:border-carloc-900 dark:focus:border-white">
          <option value="">Toutes</option>
          @for (category of categories(); track category) {
            <option [value]="category">{{ category }}</option>
          }
        </select>
      </label>
      <label class="space-y-1 md:col-span-2">
        <span class="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Marque</span>
        <input type="text" formControlName="marque" class="w-full rounded-lg border border-gray-200 dark:border-carloc-700 bg-gray-50 dark:bg-carloc-800 px-3 py-2.5 text-gray-900 dark:text-white outline-none focus:border-carloc-900 dark:focus:border-white" placeholder="Rechercher une marque" />
      </label>
      <label class="space-y-1">
        <span class="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Max / jour: {{ moneyFmt(filtersForm.value.prixMax || 10000) }}</span>
        <input type="range" formControlName="prixMax" min="0" max="10000" step="50" class="w-full accent-carloc-900 dark:accent-white" />
      </label>
    </form>
  </section>

  @if (loading()) {
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      @for (i of [1, 2, 3, 4, 5, 6]; track i) {
        <div class="h-[430px] rounded-lg bg-gray-100 dark:bg-carloc-900 animate-pulse"></div>
      }
    </div>
  } @else if (filteredVehicles().length) {
    <div class="space-y-12">
      @for (group of groupedVehicles(); track group[0]) {
        <div class="space-y-6">
          <!-- Category Header -->
          <div class="flex items-center gap-4">
            <h2 class="text-2xl font-black text-gray-900 dark:text-white capitalize tracking-tight">{{ group[0] }}</h2>
            <div class="h-px bg-gray-200 dark:bg-carloc-800 flex-1"></div>
            <span class="text-sm font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-carloc-800 px-3 py-1 rounded-full">{{ group[1].length }} véhicule(s)</span>
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            @for (vehicule of group[1]; track vehicule.id) {
              <article class="rounded-[1.5rem] overflow-hidden bg-white dark:bg-carloc-900 border border-gray-200 dark:border-carloc-800 shadow-sm hover:shadow-xl hover:shadow-carloc-900/5 dark:hover:shadow-white/5 transition-all duration-300 hover:-translate-y-1 group">
                <div class="relative aspect-[16/10] bg-gray-100 dark:bg-carloc-800 overflow-hidden">
                  <img [src]="image(vehicule, 0)" [alt]="vehicule.marque + ' ' + vehicule.modele" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <span class="absolute left-4 top-4 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border backdrop-blur-md" [ngClass]="vehicleStatusClass(vehicule)">
                    {{ label(vehicule.statut) }}
                  </span>
                </div>

                <div class="p-6 space-y-5">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <h2 class="text-xl font-black text-gray-900 dark:text-white truncate">{{ vehicule.marque }} {{ vehicule.modele }}</h2>
                      <p class="text-sm text-gray-500 dark:text-gray-400 font-medium">{{ vehicule.immatriculation }}</p>
                    </div>
                    <div class="text-right shrink-0">
                      <strong class="block text-xl font-black text-gray-900 dark:text-white">{{ moneyFmt(vehicule.prix_journalier) }}</strong>
                      <span class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest font-bold">/ jour</span>
                    </div>
                  </div>

                  <div class="grid grid-cols-3 gap-2 text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    <span class="rounded-xl bg-gray-50 dark:bg-carloc-800 px-2 py-2.5 text-center flex flex-col items-center gap-1"><i class="bi bi-fuel-pump text-base mb-0.5"></i> Prêt</span>
                    <span class="rounded-xl bg-gray-50 dark:bg-carloc-800 px-2 py-2.5 text-center flex flex-col items-center gap-1"><i class="bi bi-shield-check text-base mb-0.5"></i> Suivi</span>
                    <span class="rounded-xl bg-gray-50 dark:bg-carloc-800 px-2 py-2.5 text-center flex flex-col items-center gap-1"><i class="bi bi-clock text-base mb-0.5"></i> 24h</span>
                  </div>

                  <button type="button" class="w-full rounded-xl px-4 py-3.5 font-black uppercase tracking-widest text-xs transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50" [ngClass]="vehicule.statut === 'disponible' ? 'bg-carloc-900 dark:bg-white text-white dark:text-carloc-950 hover:bg-black dark:hover:bg-gray-200 shadow-md hover:shadow-lg' : 'bg-gray-100 dark:bg-carloc-800 text-gray-400'" [disabled]="vehicule.statut !== 'disponible'" (click)="selectVehicle(vehicule)">
                    @if (vehicule.statut === 'disponible') {
                      Louer ce véhicule
                    } @else {
                      Indisponible
                    }
                  </button>
                </div>
              </article>
            }
          </div>
        </div>
      }
    </div>
  } @else {
    <div class="rounded-lg border border-dashed border-gray-300 dark:border-carloc-700 bg-white dark:bg-carloc-900 p-10 text-center">
      <i class="bi bi-search text-4xl text-gray-400"></i>
      <h3 class="text-xl font-black text-gray-900 dark:text-white mt-4">Aucun véhicule trouvé</h3>
      <p class="text-gray-500 dark:text-gray-400 mt-2">Modifiez les filtres pour élargir la recherche.</p>
      <button type="button" (click)="resetFilters()" class="mt-6 px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-carloc-800 text-gray-900 dark:text-white font-bold">
        Réinitialiser
      </button>
    </div>
  }

  @if (selectedVehicle()) {
    <div class="fixed inset-0 z-50 bg-carloc-950/80 backdrop-blur-sm p-4 flex items-center justify-center" (click)="closeDrawer()">
      <div class="w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-lg bg-white dark:bg-carloc-950 border border-gray-200 dark:border-carloc-800 shadow-2xl flex flex-col" (click)="$event.stopPropagation()">
        <div class="flex items-start justify-between gap-4 px-5 py-4 border-b border-gray-200 dark:border-carloc-800">
          <div class="min-w-0">
            <p class="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">{{ selectedVehicle()?.categorie }}</p>
            <h3 class="text-2xl font-black text-gray-900 dark:text-white truncate">{{ selectedVehicle()?.marque }} {{ selectedVehicle()?.modele }}</h3>
            <p class="font-bold text-gray-700 dark:text-gray-300">{{ moneyFmt(selectedVehicle()?.prix_journalier) }} / jour</p>
          </div>
          <button type="button" class="w-9 h-9 rounded-lg hover:bg-gray-100 dark:hover:bg-carloc-800 text-gray-600 dark:text-gray-300" (click)="closeDrawer()">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="overflow-y-auto p-5 space-y-5">
          <div class="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-4 items-center rounded-lg bg-gray-50 dark:bg-carloc-900 border border-gray-200 dark:border-carloc-800 p-4">
            <img [src]="image(selectedVehicle()!, 0)" [alt]="selectedVehicle()?.marque" class="w-full aspect-[16/10] object-cover rounded-lg bg-white dark:bg-carloc-800" />
            <div class="space-y-2">
              <p class="text-sm text-gray-500 dark:text-gray-400">Immatriculation</p>
              <strong class="text-gray-900 dark:text-white">{{ selectedVehicle()?.immatriculation }}</strong>
              @if (clientInfo()) {
                <p class="text-sm text-gray-500 dark:text-gray-400 pt-2">Client: <strong class="text-gray-900 dark:text-white">{{ clientInfo()?.prenom }} {{ clientInfo()?.nom }}</strong></p>
              }
            </div>
          </div>

          <form [formGroup]="bookingForm" id="booking-form" (ngSubmit)="createBooking()" class="space-y-5">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label class="space-y-1">
                <span class="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Départ</span>
                <input type="date" formControlName="date_debut" [min]="minDate()" class="w-full rounded-lg border border-gray-200 dark:border-carloc-700 bg-white dark:bg-carloc-800 px-3 py-2.5 text-gray-900 dark:text-white outline-none" />
              </label>
              <label class="space-y-1">
                <span class="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Retour</span>
                <input type="date" formControlName="date_fin" [min]="bookingForm.value.date_debut || minDate()" class="w-full rounded-lg border border-gray-200 dark:border-carloc-700 bg-white dark:bg-carloc-800 px-3 py-2.5 text-gray-900 dark:text-white outline-none" />
              </label>
            </div>

            @if (bookingForm.hasError('dateInPast') || bookingForm.hasError('dateRange')) {
              <div class="rounded-lg border border-yellow-200 dark:border-yellow-900/40 bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3 text-yellow-700 dark:text-yellow-300 font-medium">
                Choisissez une période valide.
              </div>
            }

            @if (availabilityMessage()) {
              <div class="rounded-lg border px-4 py-3 font-medium" [ngClass]="availabilityOk() ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300'">
                {{ availabilityMessage() }}
              </div>
            }

            <div class="rounded-lg bg-gray-50 dark:bg-carloc-900 border border-gray-200 dark:border-carloc-800 p-4 space-y-2">
              <div class="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Tarif journalier</span>
                <strong class="text-gray-900 dark:text-white">{{ moneyFmt(selectedVehicle()?.prix_journalier) }}</strong>
              </div>
              <div class="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Durée</span>
                <strong class="text-gray-900 dark:text-white">{{ selectedDays() }} jour(s)</strong>
              </div>
              <div class="flex justify-between border-t border-gray-200 dark:border-carloc-800 pt-3 mt-3">
                <span class="font-black text-gray-900 dark:text-white">Total estimé</span>
                <strong class="text-xl font-black text-gray-900 dark:text-white">{{ moneyFmt(estimate()) }}</strong>
              </div>
            </div>

            @if (bookingMessage()) {
              <div class="rounded-lg border px-4 py-3 font-medium" [ngClass]="{
                'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300': bookingTone() === 'success',
                'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300': bookingTone() === 'danger',
                'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-900/40 dark:bg-yellow-900/20 dark:text-yellow-300': bookingTone() === 'warning'
              }">
                {{ bookingMessage() }}
                @if (profileLinkHint()) {
                  <a routerLink="/client/profil" class="block mt-2 underline font-black">Compléter mon profil</a>
                }
              </div>
            }
          </form>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 p-5 border-t border-gray-200 dark:border-carloc-800">
          <button type="button" class="sm:w-1/3 rounded-lg border border-gray-200 dark:border-carloc-700 px-4 py-3 font-bold text-gray-700 dark:text-gray-200" (click)="closeDrawer()">Annuler</button>
          <button type="submit" form="booking-form" class="sm:w-2/3 rounded-lg px-4 py-3 font-black transition-colors disabled:opacity-50" [ngClass]="(saving() || checkingAvailability() || selectedDays() <= 0 || availabilityOk() === false) ? 'bg-gray-200 dark:bg-carloc-800 text-gray-400' : 'bg-carloc-900 dark:bg-white text-white dark:text-carloc-950 hover:bg-black dark:hover:bg-gray-200'" [disabled]="saving() || checkingAvailability() || selectedDays() <= 0 || availabilityOk() === false">
            @if (saving()) {
              Réservation en cours...
            } @else if (checkingAvailability()) {
              Vérification...
            } @else {
              Confirmer la réservation
            }
          </button>
        </div>
      </div>
    </div>
  }
</div>
  `,
})
export class CataloguePageComponent implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly vehiculeService = inject(VehiculeService);
  private readonly bookingService = inject(ReservationService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly vehicles = signal<Vehicule[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly bookingMessage = signal('');
  readonly bookingTone = signal<'success' | 'danger' | 'warning'>('success');
  readonly profileLinkHint = signal(false);
  readonly availabilityMessage = signal('');
  readonly availabilityOk = signal<boolean | null>(null);
  readonly checkingAvailability = signal(false);
  readonly minDate = signal(todayIso());
  readonly selectedVehicle = signal<Vehicule | null>(null);
  readonly categorie = signal('');
  readonly marque = signal('');
  readonly prixMax = signal(10000);
  readonly clientInfo = signal<{ prenom?: string; nom?: string; email?: string } | null>(null);

  readonly selectedVehicleStatutLabel = computed(() => {
    const s = this.selectedVehicle()?.statut;
    if (s === 'disponible') return 'Disponible';
    if (s === 'loue') return 'En cours de location';
    if (s === 'maintenance') return 'En maintenance';
    return s || 'Inconnu';
  });

  readonly selectedVehicleStatutClass = computed(() => {
    const s = this.selectedVehicle()?.statut;
    if (s === 'disponible') return 'available';
    if (s === 'loue') return 'rented';
    if (s === 'maintenance') return 'maintenance';
    return '';
  });

  readonly filtersForm = this.fb.group({
    marque: [''],
    categorie: [''],
    prixMax: [10000],
  });

  readonly bookingForm = this.fb.group(
    {
      date_debut: [this.dateOffset(1), Validators.required],
      date_fin: [this.dateOffset(4), Validators.required],
    },
    { validators: reservationDatesValidator() },
  );

  readonly bookingDates = signal(this.bookingForm.getRawValue());

  readonly categories = computed(() => {
    const values = this.vehicles()
      .map((vehicle) => (vehicle.categorie ?? '').trim())
      .filter((value): value is string => Boolean(value));

    return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'fr'));
  });

  readonly filteredVehicles = computed(() => {
    const marque = this.marque().trim().toLowerCase();
    const categorie = this.categorie();
    const max = this.prixMax();

    return this.vehicles().filter((vehicle) => {
      const matchesMarque = !marque || vehicle.marque.toLowerCase().includes(marque);
      const matchesCategory = !categorie || vehicle.categorie === categorie;
      const matchesPrice = Number(vehicle.prix_journalier) <= max;
      return matchesMarque && matchesCategory && matchesPrice;
    });
  });

  readonly groupedVehicles = computed(() => {
    const groups: { [key: string]: Vehicule[] } = {};
    for (const vehicle of this.filteredVehicles()) {
      const category = vehicle.categorie || 'Autres';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(vehicle);
    }
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0], 'fr'));
  });

  readonly selectedDays = computed(() => {
    const values = this.bookingDates();
    return nbJoursLocation(values.date_debut, values.date_fin);
  });

  readonly estimate = computed(() => {
    const vehicle = this.selectedVehicle();
    const days = this.selectedDays();
    if (!vehicle || days <= 0) return 0;
    return days * toNumber(vehicle.prix_journalier);
  });

  readonly moneyFmt = money;
  readonly label = statusLabel;
  readonly tone = statusTone;

  ngOnInit() {
    this.loadVehicles();

    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('user_info');
      if (raw) {
        try { this.clientInfo.set(JSON.parse(raw)); } catch(e){}
      }
    }

    this.filtersForm.valueChanges.pipe(debounceTime(300)).subscribe((values) => {
      this.marque.set(values.marque ?? '');
      this.categorie.set(values.categorie ?? '');
      this.prixMax.set(values.prixMax ?? 10000);
    });

    this.bookingForm.valueChanges.subscribe(() => {
      this.bookingDates.set(this.bookingForm.getRawValue());
      this.bookingMessage.set('');
      this.profileLinkHint.set(false);
      this.checkAvailability();
    });
  }

  image(vehicle: Vehicule, index: number): string {
    return imageUrl(vehicle.image, vehicle.categorie, index);
  }

  vehicleStatusClass(vehicle: Vehicule): string {
    if (vehicle.statut === 'disponible') return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900/40';
    if (vehicle.statut === 'maintenance') return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-900/40';
    return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900/40';
  }

  isLoggedIn(): boolean {
    return this.auth.isLoggedIn();
  }

  selectVehicle(vehicle: Vehicule): void {
    this.bookingMessage.set('');
    this.profileLinkHint.set(false);
    this.availabilityMessage.set('');
    this.availabilityOk.set(null);
    this.selectedVehicle.set(vehicle);
    this.bookingDates.set(this.bookingForm.getRawValue());
    this.checkAvailability();
  }

  closeDrawer(): void {
    this.selectedVehicle.set(null);
    this.bookingMessage.set('');
  }

  resetFilters(): void {
    this.filtersForm.reset({
      marque: '',
      categorie: '',
      prixMax: 10000,
    });
  }

  createBooking(): void {
    const vehicle = this.selectedVehicle();
    if (!vehicle?.id) return;

    if (!this.auth.isLoggedIn()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: '/catalogue' } });
      return;
    }

    if (this.auth.isAdmin()) {
      void this.router.navigate(['/admin/reservations']);
      return;
    }

    if (this.bookingForm.invalid || this.selectedDays() <= 0) {
      this.bookingTone.set('warning');
      this.bookingMessage.set('Choisissez une période valide (fin après le début, début non passée).');
      this.bookingForm.markAllAsTouched();
      return;
    }

    if (this.availabilityOk() === false) {
      this.bookingTone.set('warning');
      this.bookingMessage.set(this.availabilityMessage() || 'Véhicule indisponible sur cette période.');
      return;
    }

    const { date_debut, date_fin } = this.bookingForm.getRawValue();
    this.saving.set(true);
    this.bookingMessage.set('');
    this.profileLinkHint.set(false);

    this.vehiculeService
      .verifierDisponibilite(vehicle.id, date_debut, date_fin)
      .pipe(
        switchMap((result) => {
          if (!result.disponible) {
            throw new Error(result.message);
          }
          const clientId = this.auth.getClientId();

          if (!clientId) {
            this.bookingTone.set('danger');
            this.bookingMessage.set('Impossible de récupérer votre profil client. Veuillez vous reconnecter.');
            this.saving.set(false);
            throw new Error('client_id introuvable');
          }

          return this.bookingService.createReservation({
            client: clientId,
            vehicule: vehicle.id,
            date_debut,
            date_fin,
          });
        }),
        finalize(() => { this.saving.set(false); this.cdr.markForCheck(); }),
      )
      .subscribe({
        next: () => {
          this.bookingTone.set('success');
          this.bookingMessage.set('Réservation confirmée. Contrat et facture générés.');
          this.loadVehicles();
          this.cdr.markForCheck();
          setTimeout(() => {
            void this.router.navigate(['/client/reservations']);
          }, 1000);
        },
        error: (err: unknown) => {
          if (err instanceof Error && !(err as { error?: unknown }).error) {
            this.bookingTone.set('warning');
            this.bookingMessage.set(err.message);
            this.cdr.markForCheck();
            return;
          }
          const parsed = extractReservationError(err);
          this.bookingTone.set('danger');
          this.bookingMessage.set(parsed.message);
          this.profileLinkHint.set(!!parsed.profileLink);
          this.cdr.markForCheck();
        },
      });
  }

  private checkAvailability(): void {
    const vehicle = this.selectedVehicle();
    const { date_debut, date_fin } = this.bookingForm.getRawValue();
    if (!vehicle?.id || !date_debut || !date_fin || this.bookingForm.invalid) {
      this.availabilityMessage.set('');
      this.availabilityOk.set(null);
      return;
    }

    this.checkingAvailability.set(true);
    this.vehiculeService
      .verifierDisponibilite(vehicle.id, date_debut, date_fin)
      .pipe(finalize(() => { this.checkingAvailability.set(false); this.cdr.markForCheck(); }))
      .subscribe({
        next: (result) => {
          this.availabilityOk.set(result.disponible);
          this.availabilityMessage.set(result.message);
          this.cdr.markForCheck();
        },
        error: () => {
          this.availabilityOk.set(null);
          this.availabilityMessage.set('');
          this.cdr.markForCheck();
        },
      });
  }

  loadVehicles(): void {
    this.loading.set(true);
    this.error.set('');

    this.vehiculeService
      .getAllVehicules()
      .pipe(finalize(() => { this.loading.set(false); this.cdr.markForCheck(); }))
      .subscribe({
        next: (vehicles) => { this.vehicles.set(vehicles); this.cdr.markForCheck(); },
        error: (err: unknown) => { this.error.set(extractApiError(err)); this.cdr.markForCheck(); },
      });
  }

  private dateOffset(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }
}
