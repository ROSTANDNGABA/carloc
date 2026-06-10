import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
<div class="lux-auth-page">
  <div class="lux-auth-card">
    <div class="auth-header">
      <h2>Bon retour parmi nous.</h2>
      <p>Connectez-vous pour accéder à votre espace de location premium.</p>
    </div>
    
    <form [formGroup]="loginForm" (ngSubmit)="submit()" class="lux-form">
      @if (errorMessage()) {
        <div class="lux-alert lux-alert-error">{{ errorMessage() }}</div>
      }
      
      <div class="form-group">
        <label for="username">Email ou prénom</label>
        <input
          id="username"
          type="text"
          formControlName="username"
          class="lux-input"
          [class.input-invalid]="submitted() && usernameControl.invalid"
          placeholder="Votre email ou identifiant"
          autocomplete="username"
        />
        @if (submitted() && usernameControl.errors?.['required']) {
          <span class="field-error">Renseignez votre email ou votre identifiant.</span>
        }
      </div>
      
      <div class="form-group">
        <label for="password">Mot de passe</label>
        <input
          id="password"
          type="password"
          formControlName="password"
          class="lux-input"
          [class.input-invalid]="submitted() && passwordControl.invalid"
          placeholder="••••••••"
        />
        @if (submitted() && passwordControl.errors?.['required']) {
          <span class="field-error">Le mot de passe est obligatoire.</span>
        }
      </div>
      
      <button type="submit" class="lux-btn lux-btn-primary full-width" [disabled]="loginForm.invalid || loading()">
        @if (loading()) { Connexion en cours... } @else { Se connecter }
      </button>
    </form>
    
    <div class="auth-footer">
      <p>Nouveau chez CarLoc ? <a routerLink="/inscription">Créer un compte</a></p>
    </div>
  </div>
</div>
  `,
  styles: [`
  .lux-auth-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: calc(100vh - 80px);
    padding: 2rem;
    background: radial-gradient(circle at center, var(--lux-surface-alt) 0%, var(--lux-bg) 100%);
  }
  .lux-auth-card {
    background-color: var(--lux-surface);
    border: 1px solid var(--lux-border);
    border-radius: var(--lux-radius);
    padding: 3rem;
    width: 100%;
    max-width: 480px;
    box-shadow: var(--lux-shadow);
  }
  .auth-header {
    text-align: center;
    margin-bottom: 2.5rem;
  }
  .auth-header h2 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }
  .auth-header p {
    color: var(--lux-text-muted);
  }
  .lux-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .form-group label {
    font-weight: 600;
    font-size: 0.95rem;
  }
  .lux-input {
    background-color: var(--lux-bg);
    border: 1px solid var(--lux-border);
    color: var(--lux-text);
    padding: 0.8rem 1rem;
    border-radius: 8px;
    font-family: var(--lux-font);
    transition: var(--lux-transition);
  }
  .lux-input:focus {
    outline: none;
    border-color: var(--lux-accent);
    box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.2);
  }
  .input-invalid {
    border-color: #dc2626;
    box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.12);
  }
  .full-width {
    width: 100%;
    margin-top: 1rem;
  }
  .auth-footer {
    margin-top: 2rem;
    text-align: center;
    color: var(--lux-text-muted);
  }
  .lux-alert-error {
    background-color: rgba(220, 53, 69, 0.1);
    color: #ff6b6b;
    border: 1px solid rgba(220, 53, 69, 0.2);
    padding: 1rem;
    border-radius: 8px;
    font-weight: 500;
  }
  .field-error {
    color: #dc2626;
    font-size: 0.82rem;
    font-weight: 600;
  }
  `]
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

  get usernameControl() {
    return this.loginForm.controls.username;
  }

  get passwordControl() {
    return this.loginForm.controls.password;
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
