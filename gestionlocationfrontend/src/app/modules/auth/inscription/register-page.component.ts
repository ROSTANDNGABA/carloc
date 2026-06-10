import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ClientService } from '@app/core/services/client.service';
import { permisValidator, telephoneValidator } from '@app/core/validators/carloc.validators';
import { extractApiError } from '@app/core/utils/api.util';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const passwordConfirm = control.get('password_confirm')?.value;
  return password === passwordConfirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-carloc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-carloc-900 via-black to-black pt-16 sm:pt-8">
  
  <div class="w-full max-w-xl bg-carloc-900/50 backdrop-blur-xl border border-carloc-800 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
    
    <!-- Decorative element -->
    <div class="absolute -bottom-32 -left-32 w-64 h-64 bg-carloc-800 rounded-full mix-blend-screen filter blur-3xl opacity-20"></div>

    <div class="text-center mb-8 relative z-10">
      <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-carloc-950 font-black text-2xl mx-auto mb-6 shadow-lg">
        C
      </div>
      <h2 class="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">Rejoignez l'Excellence.</h2>
      <p class="text-gray-400 text-sm">Créez votre compte pour réserver votre premier véhicule premium.</p>
    </div>
    
    <form [formGroup]="registerForm" (ngSubmit)="submit()" class="space-y-5 relative z-10">
      @if (errorMessage()) {
        <div class="bg-red-950/50 border border-red-900/50 text-red-400 px-4 py-3 rounded-xl text-sm font-medium">
          {{ errorMessage() }}
        </div>
      }
      @if (successMessage()) {
        <div class="bg-green-950/50 border border-green-900/50 text-green-400 px-4 py-3 rounded-xl text-sm font-medium">
          {{ successMessage() }}
        </div>
      }
      
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div class="space-y-2">
          <label for="prenom" class="block text-sm font-semibold text-gray-300">Prénom</label>
          <input
            id="prenom"
            type="text"
            formControlName="prenom"
            class="w-full bg-carloc-950/50 border border-carloc-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all placeholder:text-gray-600"
            [class.border-red-500]="submitted() && registerForm.controls.prenom.invalid"
            placeholder="Jean"
          />
          @if (submitted() && registerForm.controls.prenom.errors?.['required']) {
            <span class="text-red-400 text-xs font-semibold mt-1 block">Le prénom est obligatoire.</span>
          }
        </div>
        <div class="space-y-2">
          <label for="nom" class="block text-sm font-semibold text-gray-300">Nom</label>
          <input
            id="nom"
            type="text"
            formControlName="nom"
            class="w-full bg-carloc-950/50 border border-carloc-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all placeholder:text-gray-600"
            [class.border-red-500]="submitted() && registerForm.controls.nom.invalid"
            placeholder="Dupont"
          />
          @if (submitted() && registerForm.controls.nom.errors?.['required']) {
            <span class="text-red-400 text-xs font-semibold mt-1 block">Le nom est obligatoire.</span>
          }
        </div>
      </div>
      
      <div class="space-y-2">
        <label for="email" class="block text-sm font-semibold text-gray-300">Adresse e-mail</label>
        <input
          id="email"
          type="email"
          formControlName="email"
          class="w-full bg-carloc-950/50 border border-carloc-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all placeholder:text-gray-600"
          [class.border-red-500]="submitted() && registerForm.controls.email.invalid"
          placeholder="vous@exemple.com"
        />
        @if (submitted() && registerForm.controls.email.errors?.['required']) {
          <span class="text-red-400 text-xs font-semibold mt-1 block">L'email est obligatoire.</span>
        }
        @if (submitted() && registerForm.controls.email.errors?.['email']) {
          <span class="text-red-400 text-xs font-semibold mt-1 block">Veuillez entrer un email valide.</span>
        }
      </div>
      
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div class="space-y-2">
          <label for="telephone" class="block text-sm font-semibold text-gray-300">Téléphone</label>
          <input
            id="telephone"
            type="tel"
            formControlName="telephone"
            class="w-full bg-carloc-950/50 border border-carloc-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all placeholder:text-gray-600"
            [class.border-red-500]="submitted() && registerForm.controls.telephone.invalid"
            placeholder="+33 6 00 00 00 00"
          />
          @if (submitted() && registerForm.controls.telephone.errors?.['required']) {
            <span class="text-red-400 text-xs font-semibold mt-1 block">Le téléphone est obligatoire.</span>
          }
          @if (submitted() && registerForm.controls.telephone.errors?.['telephoneFormat']) {
            <span class="text-red-400 text-xs font-semibold mt-1 block">Format invalide.</span>
          }
        </div>
        
        <div class="space-y-2">
          <label for="num_permis" class="block text-sm font-semibold text-gray-300">Numéro de permis</label>
          <input
            id="num_permis"
            type="text"
            formControlName="num_permis"
            class="w-full bg-carloc-950/50 border border-carloc-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all placeholder:text-gray-600 uppercase"
            [class.border-red-500]="submitted() && registerForm.controls.num_permis.invalid"
            placeholder="0000000"
          />
          @if (submitted() && registerForm.controls.num_permis.errors?.['required']) {
            <span class="text-red-400 text-xs font-semibold mt-1 block">Le permis est obligatoire.</span>
          }
          @if (submitted() && registerForm.controls.num_permis.errors?.['permisFormat']) {
            <span class="text-red-400 text-xs font-semibold mt-1 block">Format invalide.</span>
          }
        </div>
      </div>
      
      <div class="space-y-2">
        <label for="password" class="block text-sm font-semibold text-gray-300">Mot de passe <span class="text-gray-500 font-normal">(min. 8)</span></label>
        <div class="relative">
          <input
            id="password"
            [type]="showPassword() ? 'text' : 'password'"
            formControlName="password"
            class="w-full bg-carloc-950/50 border border-carloc-700 text-white px-4 py-3 pr-12 rounded-xl focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all placeholder:text-gray-600 tracking-widest"
            [class.border-red-500]="submitted() && registerForm.controls.password.invalid"
            placeholder="••••••••"
          />
          <button
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            (click)="togglePasswordVisibility()"
            [attr.aria-label]="showPassword() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
            [attr.aria-pressed]="showPassword()"
          >
            <i class="bi" [class.bi-eye]="!showPassword()" [class.bi-eye-slash]="showPassword()" aria-hidden="true"></i>
          </button>
        </div>
        @if (submitted() && registerForm.controls.password.errors?.['required']) {
          <span class="text-red-400 text-xs font-semibold mt-1 block">Le mot de passe est obligatoire.</span>
        }
        @if (submitted() && registerForm.controls.password.errors?.['minlength']) {
          <span class="text-red-400 text-xs font-semibold mt-1 block">Au moins 8 caractères.</span>
        }
      </div>
      
      <div class="space-y-2">
        <label for="password_confirm" class="block text-sm font-semibold text-gray-300">Confirmer le mot de passe</label>
        <div class="relative">
          <input
            id="password_confirm"
            [type]="showPasswordConfirm() ? 'text' : 'password'"
            formControlName="password_confirm"
            class="w-full bg-carloc-950/50 border border-carloc-700 text-white px-4 py-3 pr-12 rounded-xl focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all placeholder:text-gray-600 tracking-widest"
            [class.border-red-500]="submitted() && (registerForm.controls.password_confirm.invalid || registerForm.hasError('passwordMismatch'))"
            placeholder="••••••••"
          />
          <button
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            (click)="togglePasswordConfirmVisibility()"
            [attr.aria-label]="showPasswordConfirm() ? 'Masquer la confirmation du mot de passe' : 'Afficher la confirmation du mot de passe'"
            [attr.aria-pressed]="showPasswordConfirm()"
          >
            <i class="bi" [class.bi-eye]="!showPasswordConfirm()" [class.bi-eye-slash]="showPasswordConfirm()" aria-hidden="true"></i>
          </button>
        </div>
        @if (submitted() && registerForm.controls.password_confirm.errors?.['required']) {
          <span class="text-red-400 text-xs font-semibold mt-1 block">La confirmation est obligatoire.</span>
        }
        @if (submitted() && registerForm.hasError('passwordMismatch')) {
          <span class="text-red-400 text-xs font-semibold mt-1 block">Les mots de passe ne correspondent pas.</span>
        }
      </div>
      
      <button 
        type="submit" 
        class="w-full bg-white text-carloc-950 hover:bg-gray-200 font-bold py-4 px-6 rounded-xl transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        [disabled]="loading()"
      >
        @if (loading()) { 
          <i class="bi bi-arrow-repeat animate-spin text-lg"></i>
          Création en cours... 
        } @else { 
          Créer mon compte
          <i class="bi bi-arrow-right"></i>
        }
      </button>
    </form>
    
    <div class="mt-8 text-center relative z-10">
      <p class="text-gray-400 text-sm">
        Vous avez déjà un compte ? 
        <a routerLink="/login" class="text-white font-semibold hover:underline">Se connecter</a>
      </p>
    </div>
  </div>
</div>
  `
})
export class RegisterPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly clientService = inject(ClientService);
  private readonly router = inject(Router);

  readonly registerForm = this.fb.nonNullable.group(
    {
      nom: ['', [Validators.required]],
      prenom: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.required, telephoneValidator()]],
      num_permis: ['', [Validators.required, permisValidator()]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirm: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly submitted = signal(false);
  readonly showPassword = signal(false);
  readonly showPasswordConfirm = signal(false);

  get nomControl() { return this.registerForm.controls.nom; }
  get prenomControl() { return this.registerForm.controls.prenom; }
  get emailControl() { return this.registerForm.controls.email; }
  get telephoneControl() { return this.registerForm.controls.telephone; }
  get numPermisControl() { return this.registerForm.controls.num_permis; }
  get passwordControl() { return this.registerForm.controls.password; }
  get passwordConfirmControl() { return this.registerForm.controls.password_confirm; }

  togglePasswordVisibility(): void { this.showPassword.update(value => !value); }
  togglePasswordConfirmVisibility(): void { this.showPasswordConfirm.update(value => !value); }

  submit(): void {
    this.submitted.set(true);

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.clientService
      .createClient(this.registerForm.getRawValue())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set('Compte créé avec succès. Vous pouvez maintenant vous connecter.');
          void this.router.navigate(['/login'], { queryParams: { returnUrl: '/client' } });
        },
        error: (err: unknown) => {
          this.errorMessage.set(extractApiError(err));
        },
      });
  }
}
