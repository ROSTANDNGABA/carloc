import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '@app/auth/auth.service';
import { extractApiError } from '@app/core/utils/api.util';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-carloc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-carloc-900 via-black to-black">
  
  <div class="w-full max-w-md bg-carloc-900/50 backdrop-blur-xl border border-carloc-800 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
    
    <!-- Decorative element -->
    <div class="absolute -top-24 -right-24 w-48 h-48 bg-carloc-800 rounded-full mix-blend-screen filter blur-3xl opacity-20"></div>

    <div class="text-center mb-10 relative z-10">
      <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-carloc-950 font-black text-2xl mx-auto mb-6 shadow-lg">
        C
      </div>
      <h2 class="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">Bon retour.</h2>
      <p class="text-gray-400 text-sm">Connectez-vous à votre espace premium.</p>
    </div>
    
    <form [formGroup]="loginForm" (ngSubmit)="submit()" class="space-y-6 relative z-10">
      @if (errorMessage()) {
        <div class="bg-red-950/50 border border-red-900/50 text-red-400 px-4 py-3 rounded-xl text-sm font-medium">
          {{ errorMessage() }}
        </div>
      }
      
      <div class="space-y-2">
        <label for="username" class="block text-sm font-semibold text-gray-300">Email ou identifiant</label>
        <input
          id="username"
          type="text"
          formControlName="username"
          class="w-full bg-carloc-950/50 border border-carloc-700 text-white px-4 py-3.5 rounded-xl focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all placeholder:text-gray-600"
          [class.border-red-500]="submitted() && usernameControl.invalid"
          [class.focus:border-red-500]="submitted() && usernameControl.invalid"
          [class.focus:ring-red-500]="submitted() && usernameControl.invalid"
          placeholder="Entrez votre email"
          autocomplete="username"
        />
        @if (submitted() && usernameControl.errors?.['required']) {
          <span class="text-red-400 text-xs font-semibold mt-1 block">Ce champ est requis.</span>
        }
      </div>
      
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label for="password" class="block text-sm font-semibold text-gray-300">Mot de passe</label>
          <a href="#" class="text-xs text-gray-400 hover:text-white transition-colors">Oublié ?</a>
        </div>
        <div class="relative">
          <input
            id="password"
            [type]="showPassword() ? 'text' : 'password'"
            formControlName="password"
            class="w-full bg-carloc-950/50 border border-carloc-700 text-white px-4 py-3.5 pr-12 rounded-xl focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all placeholder:text-gray-600 tracking-widest"
            [class.border-red-500]="submitted() && passwordControl.invalid"
            [class.focus:border-red-500]="submitted() && passwordControl.invalid"
            [class.focus:ring-red-500]="submitted() && passwordControl.invalid"
            placeholder="••••••••"
            autocomplete="current-password"
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
        @if (submitted() && passwordControl.errors?.['required']) {
          <span class="text-red-400 text-xs font-semibold mt-1 block">Le mot de passe est obligatoire.</span>
        }
      </div>
      
      <button 
        type="submit" 
        class="w-full bg-white text-carloc-950 hover:bg-gray-200 font-bold py-4 px-6 rounded-xl transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        [disabled]="loginForm.invalid || loading()"
      >
        @if (loading()) { 
          <i class="bi bi-arrow-repeat animate-spin text-lg"></i>
          Connexion... 
        } @else { 
          Se connecter 
          <i class="bi bi-arrow-right"></i>
        }
      </button>
    </form>
    
    <div class="mt-8 text-center relative z-10">
      <p class="text-gray-400 text-sm">
        Nouveau chez CarLoc ? 
        <a routerLink="/inscription" class="text-white font-semibold hover:underline">Créer un compte</a>
      </p>
    </div>
  </div>
</div>
  `
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loginForm = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly submitted = signal(false);
  readonly returnUrl = signal(this.getReturnUrl());
  readonly showPassword = signal(false);

  get usernameControl() {
    return this.loginForm.controls.username;
  }

  get passwordControl() {
    return this.loginForm.controls.password;
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(value => !value);
  }

  submit(): void {
    this.submitted.set(true);

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.authService
      .login(this.loginForm.getRawValue())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: tokens => {
          const role = this.authService.getRoleFromLoginResponse(tokens);
          const redirect = this.authService.resolveRedirectAfterLogin(this.returnUrl(), role);
          void this.router.navigateByUrl(redirect);
        },
        error: (err: unknown) => {
          this.errorMessage.set(this.loginErrorMessage(err));
        },
      });
  }

  private getReturnUrl(): string | null {
    const value = this.route.snapshot.queryParamMap.get('returnUrl');
    const cleaned = value?.trim();
    return cleaned ? cleaned : null;
  }

  private loginErrorMessage(err: unknown): string {
    const http = err as { status?: number; statusText?: string };
    
    // Pas de connexion au serveur
    if (http.status === 0 || http.status === undefined) {
      return 'Impossible de se connecter. Veuillez vérifier votre connexion internet et réessayer.';
    }
    
    // Trop de tentatives
    if (http.status === 429) {
      return 'Trop de tentatives de connexion. Veuillez patienter quelques instants avant de réessayer.';
    }
    
    // Identifiants invalides
    if (http.status === 401) {
      return 'Email ou mot de passe incorrect. Veuillez vérifier vos informations.';
    }
    
    // Autres erreurs (extraites via extractApiError qui filtre les détails techniques)
    return extractApiError(err) || 'Impossible de se connecter. Veuillez réessayer.';
  }
}
