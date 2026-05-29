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
<div class="lux-auth-page">
  <div class="lux-auth-card register-card">
    <div class="auth-header">
      <h2>Rejoignez l'Excellence.</h2>
      <p>Créez votre compte pour réserver votre premier véhicule premium.</p>
    </div>
    
    <form [formGroup]="registerForm" (ngSubmit)="submit()" class="lux-form">
      @if (errorMessage()) {
        <div class="lux-alert lux-alert-error">{{ errorMessage() }}</div>
      }
      @if (successMessage()) {
        <div class="lux-alert lux-alert-success">{{ successMessage() }}</div>
      }
      
      <div class="form-row">
        <div class="form-group">
          <label for="prenom">Prénom</label>
          <input id="prenom" type="text" formControlName="prenom" class="lux-input" placeholder="Jean" />
          @if (submitted() && registerForm.controls.prenom.errors?.['required']) {
            <span class="field-error">Le prénom est obligatoire.</span>
          }
        </div>
        <div class="form-group">
          <label for="nom">Nom</label>
          <input id="nom" type="text" formControlName="nom" class="lux-input" placeholder="Dupont" />
          @if (submitted() && registerForm.controls.nom.errors?.['required']) {
            <span class="field-error">Le nom est obligatoire.</span>
          }
        </div>
      </div>
      
      <div class="form-group">
        <label for="email">Adresse e-mail</label>
        <input id="email" type="email" formControlName="email" class="lux-input" placeholder="vous@exemple.com" />
        @if (submitted() && registerForm.controls.email.errors?.['required']) {
          <span class="field-error">L'email est obligatoire.</span>
        }
        @if (submitted() && registerForm.controls.email.errors?.['email']) {
          <span class="field-error">Veuillez entrer un email valide.</span>
        }
      </div>
      
      <div class="form-group">
        <label for="telephone">Téléphone</label>
        <input id="telephone" type="tel" formControlName="telephone" class="lux-input" placeholder="+33 6 00 00 00 00" />
        @if (submitted() && registerForm.controls.telephone.errors?.['required']) {
          <span class="field-error">Le téléphone est obligatoire.</span>
        }
        @if (submitted() && registerForm.controls.telephone.errors?.['telephoneFormat']) {
          <span class="field-error">Format invalide (ex. 0612345678 ou +33612345678).</span>
        }
      </div>
      
      <div class="form-group">
        <label for="password">Mot de passe <span class="hint">(min. 8 caractères)</span></label>
        <input id="password" type="password" formControlName="password" class="lux-input" placeholder="••••••••" />
        @if (submitted() && registerForm.controls.password.errors?.['required']) {
          <span class="field-error">Le mot de passe est obligatoire.</span>
        }
        @if (submitted() && registerForm.controls.password.errors?.['minlength']) {
          <span class="field-error">Le mot de passe doit contenir au moins 8 caractères.</span>
        }
      </div>
      
      <div class="form-group">
        <label for="password_confirm">Confirmer mot de passe</label>
        <input id="password_confirm" type="password" formControlName="password_confirm" class="lux-input" placeholder="••••••••" />
        @if (submitted() && registerForm.controls.password_confirm.errors?.['required']) {
          <span class="field-error">La confirmation est obligatoire.</span>
        }
        @if (submitted() && registerForm.hasError('passwordMismatch')) {
          <span class="field-error">Les mots de passe ne correspondent pas.</span>
        }
      </div>
      
      <div class="form-group">
        <label for="num_permis">Numéro de permis</label>
        <input id="num_permis" type="text" formControlName="num_permis" class="lux-input" placeholder="0000000" />
        @if (submitted() && registerForm.controls.num_permis.errors?.['required']) {
          <span class="field-error">Le numéro de permis est obligatoire.</span>
        }
        @if (submitted() && registerForm.controls.num_permis.errors?.['permisFormat']) {
          <span class="field-error">Format permis invalide (ex. AB1234567).</span>
        }
      </div>
      
      <button type="submit" class="lux-btn lux-btn-primary full-width" [disabled]="loading()">
        @if (loading()) { Création en cours... } @else { Créer mon compte }
      </button>
    </form>
    
    <div class="auth-footer">
      <p>Vous avez déjà un compte ? <a routerLink="/login">Se connecter</a></p>
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
    width: 100%;
    overflow-x: hidden;
    box-sizing: border-box;
  }
  .lux-auth-page *,
  .lux-auth-page *::before,
  .lux-auth-page *::after {
    box-sizing: border-box;
  }
  .lux-auth-card {
    background-color: var(--lux-surface);
    border: 1px solid var(--lux-border);
    border-radius: var(--lux-radius);
    padding: 3rem;
    width: 100%;
    max-width: 550px;
    min-width: 0;
    box-shadow: var(--lux-shadow);
  }
  .auth-header {
    text-align: center;
    margin-bottom: 2.5rem;
  }
  .auth-header h2 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    overflow-wrap: anywhere;
  }
  .auth-header p {
    color: var(--lux-text-muted);
    overflow-wrap: anywhere;
  }
  .lux-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  .form-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.5rem;
  }
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
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
    width: 100%;
    min-width: 0;
  }
  .lux-input:focus {
    outline: none;
    border-color: var(--lux-accent);
    box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.2);
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
  .lux-alert-success {
    background-color: rgba(40, 167, 69, 0.1);
    color: #51cf66;
    border: 1px solid rgba(40, 167, 69, 0.2);
    padding: 1rem;
    border-radius: 8px;
    font-weight: 500;
  }
  .field-error {
    color: #ff6b6b;
    font-size: 0.82rem;
    margin-top: 0.25rem;
    font-weight: 500;
  }
  .hint {
    color: var(--lux-text-muted);
    font-weight: 400;
    font-size: 0.85rem;
  }
  @media (max-width: 680px) {
    .lux-auth-page {
      align-items: flex-start;
      min-height: auto;
      padding: 1rem 0.75rem;
    }

    .lux-auth-card {
      max-width: 100%;
      padding: 1.25rem;
      border-radius: 12px;
    }

    .auth-header {
      margin-bottom: 1.5rem;
      text-align: left;
    }

    .auth-header h2 {
      font-size: 1.55rem;
      line-height: 1.15;
    }

    .auth-header p {
      font-size: 0.95rem;
    }

    .lux-form {
      gap: 1rem;
    }

    .form-row {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .lux-input {
      padding: 0.78rem 0.9rem;
    }
  }

  @media (max-width: 390px) {
    .lux-auth-page {
      padding-inline: 0.5rem;
    }

    .lux-auth-card {
      padding: 1rem;
    }
  }
  `]
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

  get nomControl() {
    return this.registerForm.controls.nom;
  }

  get prenomControl() {
    return this.registerForm.controls.prenom;
  }

  get emailControl() {
    return this.registerForm.controls.email;
  }

  get telephoneControl() {
    return this.registerForm.controls.telephone;
  }

  get numPermisControl() {
    return this.registerForm.controls.num_permis;
  }

  get passwordControl() {
    return this.registerForm.controls.password;
  }

  get passwordConfirmControl() {
    return this.registerForm.controls.password_confirm;
  }

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
