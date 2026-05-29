import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ClientService } from '@app/core/services/client.service';
import { extractApiError } from '@app/core/utils/api.util';
import { Client } from '@app/models/client.model';
import { imageUrl } from '@app/shared/formatters';

@Component({
  selector: 'app-client-profile-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="profile-page">
      <div class="page-header">
        <div class="header-left">
          <h2>Mon Profil</h2>
          <p>Gérez vos informations personnelles et vos documents.</p>
        </div>
      </div>

      <div class="profile-container">
        @if (loading()) {
          <div class="loading-state">
            <div class="loading-spinner"></div>
            Chargement du profil...
          </div>
        } @else if (client(); as c) {
          <div class="profile-card">
            <div class="profile-header">
              <div class="profile-avatar-wrapper">
                <img
                  [src]="avatar(c)"
                  alt="Photo de profil"
                  class="avatar-img"
                  (error)="onAvatarError($event)"
                />
                @if (editing()) {
                  <div class="avatar-overlay">
                    <i class="bi bi-camera" aria-hidden="true"></i>
                  </div>
                }
              </div>
              <div class="profile-header-info">
                <h3>{{ c.prenom }} {{ c.nom }}</h3>
                <p class="profile-email">
                  <i class="bi bi-envelope" aria-hidden="true"></i>
                  {{ c.email }}
                </p>
                <p class="profile-phone">
                  <i class="bi bi-telephone" aria-hidden="true"></i>
                  {{ c.telephone }}
                </p>
              </div>
              <button
                class="btn-edit"
                type="button"
                (click)="toggleEdit()"
              >
                @if (editing()) {
                  <i class="bi bi-x-lg" aria-hidden="true"></i>
                  Annuler
                } @else {
                  <i class="bi bi-pencil-square" aria-hidden="true"></i>
                  Modifier
                }
              </button>
            </div>

            @if (editing()) {
              <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="profile-form">
                @if (error()) {
                  <div class="alert alert-error">
                    <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
                    {{ error() }}
                  </div>
                }
                @if (message()) {
                  <div class="alert alert-success">
                    <i class="bi bi-check-circle" aria-hidden="true"></i>
                    {{ message() }}
                  </div>
                }

                <div class="form-section">
                  <div class="section-header">
                    <i class="bi bi-person" aria-hidden="true"></i>
                    <h4>Informations Personnelles</h4>
                  </div>
                  <div class="form-grid">
                    <div class="form-group">
                      <label for="prenom">
                        <i class="bi bi-person-fill" aria-hidden="true"></i>
                        Prénom
                      </label>
                      <input type="text" id="prenom" formControlName="prenom" class="form-control" placeholder="Votre prénom" />
                      @if (profileForm.get('prenom')?.touched && profileForm.get('prenom')?.invalid) {
                        <div class="form-error">
                          <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
                          Prénom obligatoire
                        </div>
                      }
                    </div>
                    <div class="form-group">
                      <label for="nom">
                        <i class="bi bi-person-badge" aria-hidden="true"></i>
                        Nom
                      </label>
                      <input type="text" id="nom" formControlName="nom" class="form-control" placeholder="Votre nom" />
                      @if (profileForm.get('nom')?.touched && profileForm.get('nom')?.invalid) {
                        <div class="form-error">
                          <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
                          Nom obligatoire
                        </div>
                      }
                    </div>
                    <div class="form-group">
                      <label for="email">
                        <i class="bi bi-envelope" aria-hidden="true"></i>
                        Email
                      </label>
                      <input type="email" id="email" formControlName="email" class="form-control" placeholder="Votre email" />
                      @if (profileForm.get('email')?.touched && profileForm.get('email')?.invalid) {
                        <div class="form-error">
                          <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
                          Email valide obligatoire
                        </div>
                      }
                    </div>
                    <div class="form-group">
                      <label for="telephone">
                        <i class="bi bi-telephone" aria-hidden="true"></i>
                        Téléphone
                      </label>
                      <input type="text" id="telephone" formControlName="telephone" class="form-control" placeholder="Votre numéro de téléphone" />
                      @if (profileForm.get('telephone')?.touched && profileForm.get('telephone')?.invalid) {
                        <div class="form-error">
                          <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
                          Téléphone obligatoire
                        </div>
                      }
                    </div>
                    <div class="form-group full-width">
                      <label for="adresse">
                        <i class="bi bi-geo-alt" aria-hidden="true"></i>
                        Adresse
                      </label>
                      <input type="text" id="adresse" formControlName="adresse" class="form-control" placeholder="Votre adresse complète" />
                    </div>
                    <div class="form-group">
                      <label for="num_cni">
                        <i class="bi bi-card-text" aria-hidden="true"></i>
                        Numéro CNI
                      </label>
                      <input type="text" id="num_cni" formControlName="num_cni" class="form-control" placeholder="Numéro de carte nationale d'identité" />
                    </div>
                    <div class="form-group">
                      <label for="num_permis">
                        <i class="bi bi-award" aria-hidden="true"></i>
                        Numéro de Permis
                      </label>
                      <input type="text" id="num_permis" formControlName="num_permis" class="form-control" placeholder="Numéro de permis de conduire" />
                      @if (profileForm.get('num_permis')?.touched && profileForm.get('num_permis')?.invalid) {
                        <div class="form-error">
                          <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
                          Numéro de permis obligatoire
                        </div>
                      }
                    </div>
                  </div>
                </div>

                <div class="form-section">
                  <div class="section-header">
                    <i class="bi bi-lock" aria-hidden="true"></i>
                    <h4>Sécurité</h4>
                  </div>
                  <div class="form-grid">
                    <div class="form-group">
                      <label for="mot_de_passe">
                        <i class="bi bi-key" aria-hidden="true"></i>
                        Nouveau Mot de passe (optionnel)
                      </label>
                      <input type="password" id="mot_de_passe" formControlName="mot_de_passe" class="form-control" placeholder="••••••••" />
                    </div>
                    <div class="form-group">
                      <label for="confirmation_mot_de_passe">
                        <i class="bi bi-shield-lock" aria-hidden="true"></i>
                        Confirmer le mot de passe
                      </label>
                      <input type="password" id="confirmation_mot_de_passe" formControlName="confirmation_mot_de_passe" class="form-control" placeholder="••••••••" />
                    </div>
                  </div>
                </div>

                <div class="form-section">
                  <div class="section-header">
                    <i class="bi bi-image" aria-hidden="true"></i>
                    <h4>Photo de Profil</h4>
                  </div>
                  <div class="file-upload-wrapper">
                    <div class="file-upload-area">
                      <i class="bi bi-cloud-arrow-up" aria-hidden="true"></i>
                      <p class="upload-text">
                        Glissez et déposez votre image ici
                      </p>
                      <p class="upload-subtext">
                        ou cliquez pour parcourir
                      </p>
                      <input type="file" (change)="onFileSelected($event)" accept="image/*" class="file-input" />
                    </div>
                    @if (selectedPhoto()) {
                      <div class="file-info">
                        <i class="bi bi-file-earmark-image" aria-hidden="true"></i>
                        <span>{{ selectedPhoto()?.name }}</span>
                        <button type="button" class="remove-file-btn" (click)="removeFile()">
                          <i class="bi bi-x" aria-hidden="true"></i>
                        </button>
                      </div>
                    }
                  </div>
                </div>

                <div class="form-actions">
                  <button type="button" class="btn btn-secondary" (click)="toggleEdit()">
                    <i class="bi bi-x-circle" aria-hidden="true"></i>
                    Annuler
                  </button>
                  <button type="submit" class="btn btn-primary" [disabled]="saving()">
                    @if (saving()) {
                      <div class="spinner"></div>
                      Sauvegarde en cours...
                    } @else {
                      <i class="bi bi-check-circle" aria-hidden="true"></i>
                      Sauvegarder
                    }
                  </button>
                </div>
              </form>
            } @else {
              <div class="profile-details">
                <div class="details-grid">
                  <div class="detail-card">
                    <div class="detail-icon">
                      <i class="bi bi-person" aria-hidden="true"></i>
                    </div>
                    <div class="detail-content">
                      <span class="detail-label">Prénom</span>
                      <span class="detail-value">{{ c.prenom }}</span>
                    </div>
                  </div>
                  <div class="detail-card">
                    <div class="detail-icon">
                      <i class="bi bi-person-badge" aria-hidden="true"></i>
                    </div>
                    <div class="detail-content">
                      <span class="detail-label">Nom</span>
                      <span class="detail-value">{{ c.nom }}</span>
                    </div>
                  </div>
                  <div class="detail-card">
                    <div class="detail-icon">
                      <i class="bi bi-envelope" aria-hidden="true"></i>
                    </div>
                    <div class="detail-content">
                      <span class="detail-label">Email</span>
                      <span class="detail-value">{{ c.email }}</span>
                    </div>
                  </div>
                  <div class="detail-card">
                    <div class="detail-icon">
                      <i class="bi bi-telephone" aria-hidden="true"></i>
                    </div>
                    <div class="detail-content">
                      <span class="detail-label">Téléphone</span>
                      <span class="detail-value">{{ c.telephone }}</span>
                    </div>
                  </div>
                  <div class="detail-card full-width">
                    <div class="detail-icon">
                      <i class="bi bi-geo-alt" aria-hidden="true"></i>
                    </div>
                    <div class="detail-content">
                      <span class="detail-label">Adresse</span>
                      <span class="detail-value">{{ c.adresse || 'Non renseignée' }}</span>
                    </div>
                  </div>
                  <div class="detail-card">
                    <div class="detail-icon">
                      <i class="bi bi-card-text" aria-hidden="true"></i>
                    </div>
                    <div class="detail-content">
                      <span class="detail-label">Numéro CNI</span>
                      <span class="detail-value">{{ c.num_cni || 'Non renseigné' }}</span>
                    </div>
                  </div>
                  <div class="detail-card">
                    <div class="detail-icon">
                      <i class="bi bi-award" aria-hidden="true"></i>
                    </div>
                    <div class="detail-content">
                      <span class="detail-label">Numéro de Permis</span>
                      <span class="detail-value">{{ c.num_permis }}</span>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .profile-page {
      padding: 2rem;
      width: 100%;
      max-width: 1100px;
      margin: 0 auto;
      color: var(--lux-text);
      box-sizing: border-box;
      overflow-x: hidden;
    }

    .profile-page *,
    .profile-page *::before,
    .profile-page *::after {
      box-sizing: border-box;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .page-header h2 {
      font-size: 2rem;
      margin: 0 0 0.5rem 0;
      color: var(--lux-heading);
      font-weight: 700;
    }

    .page-header p {
      margin: 0;
      color: var(--lux-text-muted);
      font-size: 1rem;
    }

    .profile-container {
      width: 100%;
    }

    .loading-state {
      text-align: center;
      padding: 5rem 2rem;
      color: var(--lux-text-muted);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.5rem;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--lux-border);
      border-top-color: var(--lux-accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .profile-card {
      background: var(--lux-surface);
      border-radius: 16px;
      border: 1px solid var(--lux-border);
      box-shadow: var(--lux-shadow);
      overflow: hidden;
      max-width: 100%;
    }

    .profile-header {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding: 2.5rem;
      border-bottom: 1px solid var(--lux-border);
      background: linear-gradient(135deg, rgba(30, 64, 175, 0.05) 0%, var(--lux-surface) 100%);
    }

    .profile-avatar-wrapper {
      position: relative;
      width: 120px;
      height: 120px;
      border-radius: 50%;
      overflow: hidden;
      border: 4px solid var(--lux-surface);
      box-shadow: var(--lux-shadow);
    }

    .avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .avatar-overlay:hover {
      background: rgba(0, 0, 0, 0.7);
    }

    .avatar-overlay i {
      font-size: 2rem;
      color: #ffffff;
    }

    .profile-header-info {
      flex: 1;
      min-width: 0;
    }

    .profile-header-info h3 {
      margin: 0 0 0.75rem 0;
      font-size: 1.75rem;
      color: var(--lux-heading);
      font-weight: 700;
      overflow-wrap: anywhere;
    }

    .profile-email,
    .profile-phone {
      margin: 0.25rem 0;
      color: var(--lux-text-muted);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.95rem;
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .btn-edit {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.85rem 1.5rem;
      border: 1px solid var(--lux-border);
      border-radius: 12px;
      background: var(--lux-surface);
      color: var(--lux-text);
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-edit:hover {
      background: var(--lux-surface-alt);
      border-color: var(--lux-accent);
      transform: translateY(-2px);
      box-shadow: var(--lux-shadow);
    }

    .profile-details {
      padding: 2.5rem;
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1.25rem;
    }

    .detail-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      min-width: 0;
      background: rgba(30, 64, 175, 0.03);
      border-radius: 12px;
      border: 1px solid var(--lux-border);
      transition: all 0.3s ease;
    }

    .detail-card:hover {
      background: rgba(30, 64, 175, 0.05);
      transform: translateY(-2px);
    }

    .detail-card.full-width {
      grid-column: 1 / -1;
    }

    .detail-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(30, 64, 175, 0.1) 0%, rgba(30, 64, 175, 0.05) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--lux-accent);
      font-size: 1.25rem;
      flex: 0 0 48px;
    }

    .detail-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
    }

    .detail-label {
      font-size: 0.8rem;
      color: var(--lux-text-muted);
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .detail-value {
      font-size: 1rem;
      color: var(--lux-text);
      font-weight: 600;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .profile-form {
      padding: 2.5rem;
    }

    .form-section {
      margin-bottom: 2.5rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid var(--lux-border);
    }

    .form-section:last-of-type {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.75rem;
    }

    .section-header i {
      font-size: 1.25rem;
      color: var(--lux-heading);
    }

    .section-header h4 {
      margin: 0;
      font-size: 1.2rem;
      color: var(--lux-heading);
      font-weight: 700;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      min-width: 0;
    }

    .form-group.full-width {
      grid-column: 1 / -1;
    }

    .form-group label {
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--lux-heading);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .form-group label i {
      font-size: 0.95rem;
      color: var(--lux-text-muted);
    }

    .form-control {
      padding: 0.95rem 1.25rem;
      border: 1px solid var(--lux-border);
      border-radius: 12px;
      font-size: 1rem;
      background: var(--lux-bg);
      color: var(--lux-text);
      transition: all 0.3s ease;
      width: 100%;
      min-width: 0;
    }

    .form-control:focus {
      outline: none;
      border-color: var(--lux-accent);
      box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.1);
      background: var(--lux-bg);
    }

    .form-error {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      color: #ff6b6b;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .file-upload-wrapper {
      width: 100%;
    }

    .file-upload-area {
      position: relative;
      padding: 3rem 2rem;
      border: 2px dashed var(--lux-border);
      border-radius: 16px;
      background: var(--lux-surface-alt);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .file-upload-area:hover {
      border-color: var(--lux-accent);
      background: var(--lux-surface);
    }

    .file-upload-area i {
      font-size: 3rem;
      color: var(--lux-text-muted);
    }

    .upload-text {
      margin: 0;
      color: var(--lux-heading);
      font-size: 1rem;
      font-weight: 600;
    }

    .upload-subtext {
      margin: 0;
      color: var(--lux-text-muted);
      font-size: 0.9rem;
    }

    .file-input {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
    }

    .file-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: 1rem;
      padding: 1rem 1.25rem;
      background: var(--lux-surface-alt);
      border-radius: 12px;
      border: 1px solid var(--lux-border);
    }

    .file-info i {
      font-size: 1.25rem;
      color: var(--lux-text);
    }

    .file-info span {
      flex: 1;
      min-width: 0;
      color: var(--lux-text);
      font-weight: 600;
      font-size: 0.95rem;
      overflow-wrap: anywhere;
    }

    .remove-file-btn {
      padding: 0.5rem;
      border: none;
      border-radius: 8px;
      background: rgba(255, 107, 107, 0.1);
      color: #ff6b6b;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .remove-file-btn:hover {
      background: rgba(255, 107, 107, 0.2);
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 2.5rem;
    }

    .btn {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.95rem 2rem;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
    }

    .btn-secondary {
      border: 1px solid var(--lux-border);
      background: var(--lux-surface);
      color: var(--lux-text);
    }

    .btn-secondary:hover:not(:disabled) {
      background: var(--lux-surface-alt);
      transform: translateY(-2px);
    }

    .btn-primary {
      border: none;
      background: var(--lux-accent);
      color: #000000;
    }

    .btn-primary:hover:not(:disabled) {
      filter: brightness(1.1);
      transform: translateY(-2px);
      box-shadow: var(--lux-shadow);
    }

    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid var(--lux-border);
      border-top-color: var(--lux-accent);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    .alert {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1.25rem 1.5rem;
      border-radius: 12px;
      margin-bottom: 2rem;
    }

    .alert i {
      font-size: 1.25rem;
    }

    .alert-error {
      background: rgba(255, 107, 107, 0.1);
      color: #ff6b6b;
      border: 1px solid rgba(255, 107, 107, 0.2);
    }

    .alert-success {
      background: rgba(72, 187, 120, 0.1);
      color: #48bb78;
      border: 1px solid rgba(72, 187, 120, 0.2);
    }

    @media (max-width: 768px) {
      .profile-page {
        padding: 0.75rem;
      }

      .profile-header {
        flex-direction: column;
        text-align: center;
        gap: 1rem;
      }

      .profile-header-info {
        text-align: center;
      }

      .profile-header-info h3 {
        font-size: 1.5rem;
      }

      .form-grid,
      .details-grid {
        grid-template-columns: 1fr;
      }

      .form-actions {
        flex-direction: column;
      }

      .form-actions .btn {
        width: 100%;
        justify-content: center;
      }

      .profile-form,
      .profile-details {
        padding: 1rem;
      }

      .profile-header {
        padding: 1.5rem 1rem;
      }

      .detail-card {
        align-items: flex-start;
        padding: 1rem;
      }

      .detail-icon {
        width: 42px;
        height: 42px;
        flex-basis: 42px;
      }

      .file-upload-area {
        padding: 2rem 1rem;
      }
    }

    @media (max-width: 420px) {
      .profile-page {
        padding: 0.5rem;
      }

      .page-header h2 {
        font-size: 1.55rem;
      }

      .profile-card {
        border-radius: 12px;
      }

      .profile-avatar-wrapper {
        width: 92px;
        height: 92px;
      }

      .profile-header-info h3 {
        font-size: 1.25rem;
      }

      .detail-card {
        gap: 0.75rem;
      }

      .detail-label {
        font-size: 0.72rem;
      }

      .detail-value {
        font-size: 0.95rem;
      }
    }
  `]
})
export class ClientProfilePageComponent implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly clients = inject(ClientService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly client = signal<Client | null>(null);
  readonly editing = signal(false);
  readonly selectedPhoto = signal<File | null>(null);
  readonly avatarVersion = signal<number | null>(null);

  readonly profileForm = this.fb.group({
    nom: ['', Validators.required],
    prenom: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telephone: ['', Validators.required],
    num_permis: ['', Validators.required],
    num_cni: [''],
    adresse: [''],
    mot_de_passe: [''],
    confirmation_mot_de_passe: [''],
  });

  ngOnInit() {
    this.load();
  }

  toggleEdit(): void {
    if (this.editing()) {
      this.cancelEdit();
    } else {
      this.editing.set(true);
    }
  }

  saveProfile(): void {
    const client = this.client();
    this.error.set('');
    this.message.set('');

    if (!client?.id) return;

    if (this.profileForm.invalid) {
      this.error.set('Veuillez remplir correctement tous les champs obligatoires.');
      this.profileForm.markAllAsTouched();
      return;
    }

    const values = this.profileForm.getRawValue();
    const payload = new FormData();
    payload.append('nom', values.nom);
    payload.append('prenom', values.prenom);
    payload.append('email', values.email);
    payload.append('telephone', values.telephone);
    payload.append('num_permis', values.num_permis);
    payload.append('num_cni', values.num_cni ?? '');
    payload.append('adresse', values.adresse ?? '');

    this.saving.set(true);
    this.error.set('');
    this.message.set('');

    if (values.mot_de_passe) {
      if (values.mot_de_passe !== values.confirmation_mot_de_passe) {
        this.error.set('Les mots de passe ne correspondent pas.');
        this.saving.set(false);
        return;
      }
      payload.append('mot_de_passe', values.mot_de_passe);
      payload.append('password', values.mot_de_passe);
    }

    const photo = this.selectedPhoto();
    if (photo) {
      payload.append('photo_profil', photo);
    }
    this.clients
      .updateClient(client.id, payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: updated => {
          const version = photo ? Date.now() : null;
          if (version) {
            this.avatarVersion.set(version);
          }
          this.client.set(updated);
          this.patchForm(updated);
          this.profileForm.patchValue({ mot_de_passe: '', confirmation_mot_de_passe: '' });
          this.selectedPhoto.set(null);
          this.editing.set(false);
          this.message.set('Profil mis à jour avec succès !');

          const userInfoStr = localStorage.getItem('user_info');
          if (userInfoStr) {
            try {
              const userInfo = JSON.parse(userInfoStr);
              const photoSource = updated.photo_profil_url ?? updated.photo_profil;
              if (photoSource) {
                const freshPhoto = this.withCacheBust(imageUrl(photoSource, 'client', 0), version ?? Date.now());
                userInfo.photo_profil = freshPhoto;
                userInfo.photo_profil_url = freshPhoto;
              }
              userInfo.nom = updated.nom;
              userInfo.prenom = updated.prenom;
              userInfo.email = updated.email;
              localStorage.setItem('user_info', JSON.stringify(userInfo));
              window.dispatchEvent(new Event('user-info-updated'));
            } catch (e) {}
          }
        },
        error: (err: unknown) => this.error.set(extractApiError(err)),
      });
  }

  avatar(client: Client): string {
    const source = client.photo_profil_url ?? client.photo_profil;
    const url = imageUrl(source, 'client', 0);
    const version = this.avatarVersion();
    return source && version ? this.withCacheBust(url, version) : url;
  }

  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = imageUrl(null, 'client', 0);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedPhoto.set(input.files?.[0] ?? null);
  }

  removeFile(): void {
    this.selectedPhoto.set(null);
  }

  cancelEdit(): void {
    const client = this.client();
    if (client) {
      this.patchForm(client);
    }
    this.selectedPhoto.set(null);
    this.error.set('');
    this.message.set('');
    this.editing.set(false);
  }

  private load(): void {
    this.loading.set(true);
    this.clients
      .getMe()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: client => {
          this.client.set(client);
          this.patchForm(client);
        },
        error: (err: unknown) => this.error.set(extractApiError(err)),
      });
  }

  private withCacheBust(url: string, version: number): string {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${version}`;
  }

  private patchForm(client: Client): void {
    this.profileForm.patchValue({
      nom: client.nom,
      prenom: client.prenom,
      email: client.email,
      telephone: client.telephone,
      num_permis: client.num_permis,
      num_cni: client.num_cni ?? '',
      adresse: client.adresse ?? '',
    });
  }
}
