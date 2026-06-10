import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
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
  styleUrls: ['./catalogue-dark.css'],
  template: `
    <div class="lux-catalogue">
      <div class="catalogue-header lux-container">
        <div class="header-content">
          <div class="eyebrow">Notre Collection</div>
          <h1>Trouvez l'exception.</h1>
          <p>
            Parcourez notre flotte de véhicules haut de gamme et réservez l'excellence pour votre
            prochain trajet.
          </p>
        </div>
      </div>

      <div class="lux-container">
        @if (error()) {
          <div class="lux-alert lux-alert-error">{{ error() }}</div>
        }

        <div class="catalogue-content">
          <div class="catalogue-filters-row">
            <form [formGroup]="filtersForm" class="lux-form filter-card">
              <h3>Filtrer la sélection</h3>

              <div class="filters-grid">
                <div class="form-group">
                  <label>Catégorie</label>
                  <select formControlName="categorie" class="lux-input">
                    <option value="">Toutes les catégories</option>
                    @for (category of categories(); track category) {
                      <option [value]="category">{{ category }}</option>
                    }
                  </select>
                </div>

                <div class="form-group">
                  <label>Marque</label>
                  <input
                    type="text"
                    formControlName="marque"
                    class="lux-input"
                    placeholder="Ex: Mercedes, BMW..."
                  />
                </div>

                <div class="form-group">
                  <label>Prix max / jour ({{ filtersForm.value.prixMax || 500 }} FCFA)</label>
                  <input
                    type="range"
                    formControlName="prixMax"
                    class="lux-range"
                    min="0"
                    max="10000"
                    step="50"
                  />
                </div>
              </div>
            </form>
          </div>

          <main class="catalogue-grid-wrapper">
            @if (loading()) {
              <div class="lux-skeleton-grid">
                @for (i of [1, 2, 3, 4, 5, 6]; track i) {
                  <div class="lux-skeleton-card"></div>
                }
              </div>
            } @else {
              @if (groupedVehicles().length) {
                @for (group of groupedVehicles(); track group[0]) {
                  <div class="category-section">
                    <h2 class="category-title">{{ group[0] }}</h2>
                    <div class="lux-catalogue-grid">
                      @for (vehicule of group[1]; track vehicule.id) {
                        <div class="lux-vehicle-card">
                          <div class="vehicle-image-wrap">
                            <img
                              [src]="image(vehicule, 0)"
                              [alt]="vehicule.marque + ' ' + vehicule.modele"
                              class="lux-vehicle-image"
                            />
                            @if (vehicule.statut === 'disponible') {
                              <span class="status-badge available">Disponible</span>
                            } @else if (vehicule.statut === 'maintenance') {
                              <span class="status-badge unavailable">Maintenance</span>
                            } @else {
                              <span class="status-badge unavailable">Indisponible</span>
                            }
                          </div>
                          <div class="lux-vehicle-info">
                            <div class="vehicle-title">
                              <h3>{{ vehicule.marque }} {{ vehicule.modele }}</h3>
                              <div class="vehicle-price">
                                <strong>{{ moneyFmt(vehicule.prix_journalier) }}</strong
                                ><span class="muted">/jour</span>
                              </div>
                            </div>
                            <div class="vehicle-specs">
                              <span><i class="bi bi-gear"></i> Auto</span>
                              <span><i class="bi bi-person"></i> 5 pl.</span>
                              <span class="category-tag">{{ vehicule.categorie }}</span>
                            </div>
                            <button
                              class="lux-btn lux-btn-outline full-width"
                              (click)="selectVehicle(vehicule)"
                              [disabled]="vehicule.statut !== 'disponible'"
                              [attr.title]="
                                vehicule.statut !== 'disponible' ? 'Véhicule non réservable' : null
                              "
                            >
                              Réserver ce modèle
                            </button>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                }
              } @else {
                <div class="lux-empty-state">
                  <i class="bi bi-search"></i>
                  <h3>Aucun véhicule trouvé</h3>
                  <p>Modifiez vos filtres pour découvrir plus de modèles.</p>
                </div>
              }
            }
          </main>
        </div>
      </div>

      @if (selectedVehicle()) {
        <div class="modal-overlay" (click)="closeDrawer()">
          <div class="modal-container" (click)="$event.stopPropagation()">
            <!-- HEADER -->
            <div class="modal-header">
              <div class="header-vehicle">
                <span class="header-category">{{ selectedVehicle()?.categorie }}</span>
                <h3>{{ selectedVehicle()?.marque }} {{ selectedVehicle()?.modele }}</h3>
                <p class="header-price">{{ moneyFmt(selectedVehicle()?.prix_journalier) }} <span>/ jour</span></p>
              </div>
              <button class="modal-close-btn" (click)="closeDrawer()" aria-label="Fermer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <!-- BODY -->
            <div class="modal-body">
              <!-- Aperçu véhicule -->
              <div class="vehicle-preview">
                <img [src]="image(selectedVehicle()!, 0)" [alt]="selectedVehicle()?.marque + ' ' + selectedVehicle()?.modele" />
                <div class="vehicle-preview-meta">
                  <span class="plate">{{ selectedVehicle()?.immatriculation }}</span>
                  <span class="status-badge" [class]="selectedVehicleStatutClass()">
                    {{ selectedVehicleStatutLabel() }}
                  </span>
                </div>
              </div>

              <!-- Locataire -->
              @if (clientInfo()) {
                <div class="renter-card">
                  <div class="renter-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  </div>
                  <div class="renter-info">
                    <strong>{{ clientInfo()?.prenom }} {{ clientInfo()?.nom }}</strong>
                    <span>{{ clientInfo()?.email }}</span>
                  </div>
                </div>
              }

              <!-- Formulaire -->
              <form [formGroup]="bookingForm" id="booking-form" (ngSubmit)="createBooking()" class="booking-form">
                <div class="date-grid">
                  <div class="date-field" [class.has-error]="bookingForm.hasError('dateInPast')">
                    <label>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                      Départ
                    </label>
                    <input type="date" formControlName="date_debut" [min]="minDate()" />
                    @if (bookingForm.hasError('dateInPast')) {
                      <span class="field-hint error">La date de début ne peut pas être dans le passé.</span>
                    }
                  </div>
                  <div class="date-field" [class.has-error]="bookingForm.hasError('dateRange')">
                    <label>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                      Retour
                    </label>
                    <input type="date" formControlName="date_fin" [min]="bookingForm.value.date_debut || minDate()" />
                    @if (bookingForm.hasError('dateRange')) {
                      <span class="field-hint error">La date de fin doit être après la date de début.</span>
                    }
                  </div>
                </div>

                <!-- Badge disponibilité -->
                @if (availabilityMessage()) {
                  <div class="availability-badge" [class.ok]="availabilityOk()" [class.ko]="!availabilityOk()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      @if (availabilityOk()) {
                        <polyline points="20 6 9 17 4 12"></polyline>
                      } @else {
                        <circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>
                      }
                    </svg>
                    {{ availabilityMessage() }}
                  </div>
                }

                <!-- Récapitulatif -->
                <div class="price-card">
                  <div class="price-row">
                    <span>Tarif journalier</span>
                    <span>{{ moneyFmt(selectedVehicle()?.prix_journalier) }}</span>
                  </div>
                  <div class="price-row">
                    <span>Durée</span>
                    <span>{{ selectedDays() }} jour(s)</span>
                  </div>
                  <div class="price-divider"></div>
                  <div class="price-row total">
                    <span>Total estimé</span>
                    <strong>{{ moneyFmt(estimate()) }}</strong>
                  </div>
                  <p class="price-disclaimer">Montant indicatif — le total exact est calculé par le serveur.</p>
                </div>

                <!-- Messages -->
                @if (bookingMessage()) {
                  <div class="form-message" [class.success]="bookingTone() === 'success'" [class.danger]="bookingTone() === 'danger'" [class.warning]="bookingTone() === 'warning'">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      @if (bookingTone() === 'success') { <polyline points="20 6 9 17 4 12"></polyline> }
                      @if (bookingTone() === 'danger') { <circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line> }
                      @if (bookingTone() === 'warning') { <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line> }
                    </svg>
                    {{ bookingMessage() }}
                    @if (profileLinkHint()) {
                      <a routerLink="/client/profil" class="profile-link">Compléter mon profil →</a>
                    }
                  </div>
                }
              </form>
            </div>

            <!-- FOOTER -->
            <div class="modal-footer">
              <button type="button" class="btn-cancel" (click)="closeDrawer()">Annuler</button>
              <button
                type="submit"
                form="booking-form"
                class="btn-confirm"
                [disabled]="saving() || checkingAvailability() || selectedDays() <= 0 || availabilityOk() === false"
              >
                @if (saving()) {
                  <span class="spinner"></span> En cours...
                } @else if (checkingAvailability()) {
                  <span class="spinner"></span> Vérification…
                } @else {
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Confirmer la réservation
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .lux-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 2rem;
      }
      .lux-catalogue {
        padding-bottom: 6rem;
      }
      .catalogue-header {
        padding: 4rem 2rem 3rem;
        border-bottom: 1px solid var(--lux-border);
        margin-bottom: 3rem;
      }
      .header-content {
        max-width: 800px;
        margin: 0 auto;
      }
      .eyebrow {
        color: var(--lux-accent);
        text-transform: uppercase;
        letter-spacing: 0.2em;
        font-weight: 700;
        font-size: 0.9rem;
        margin-bottom: 1rem;
      }
      .header-content h1 {
        font-size: 3.5rem;
        margin-bottom: 1rem;
        font-weight: 800;
      }
      .header-content p {
        font-size: 1.15rem;
        color: var(--lux-text-muted);
      }

      @media (max-width: 767.98px) {
        .lux-container {
          padding: 0 1.5rem;
        }
        .catalogue-header {
          padding: 3rem 1.5rem 2rem;
        }
        .header-content h1 {
          font-size: 2.5rem;
        }
        .header-content p {
          font-size: 1rem;
        }
        .lux-catalogue-grid {
          grid-template-columns: 1fr !important;
        }
        .lux-skeleton-grid {
          grid-template-columns: 1fr !important;
        }
        .filter-card {
          padding: 1.5rem;
        }
        .filters-grid {
          grid-template-columns: 1fr;
        }
      }
      .catalogue-content {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }
      .catalogue-filters-row {
        width: 100%;
      }
      .filter-card {
        background: var(--lux-surface);
        border: 1px solid var(--lux-border);
        border-radius: var(--lux-radius);
        padding: 2rem;
      }
      .filter-card h3 {
        margin-bottom: 1.5rem;
        font-size: 1.2rem;
      }
      .lux-form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .filters-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .lux-input {
        background-color: var(--lux-bg);
        border: 1px solid var(--lux-border);
        color: var(--lux-text);
        padding: 0.8rem 1rem;
        border-radius: 8px;
        font-family: var(--lux-font);
      }
      .lux-range {
        accent-color: var(--lux-accent);
        width: 100%;
      }

      .category-section {
        margin-bottom: 3rem;
      }
      .category-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--lux-heading);
        margin-bottom: 1.5rem;
        padding-bottom: 0.75rem;
        border-bottom: 2px solid var(--lux-accent);
        text-transform: capitalize;
      }
      .lux-catalogue-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 2rem;
      }
      .lux-vehicle-card {
        background: var(--lux-surface);
        border: 1px solid var(--lux-border);
        border-radius: var(--lux-radius);
        overflow: hidden;
        transition: var(--lux-transition);
      }
      .lux-vehicle-card:hover {
        border-color: var(--lux-accent);
        transform: translateY(-5px);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      }
      .vehicle-image-wrap {
        position: relative;
        height: 200px;
        background: radial-gradient(circle, var(--lux-surface-alt) 0%, var(--lux-bg) 100%);
        padding: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-bottom: 1px solid var(--lux-border);
      }
      .lux-vehicle-image {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
      .status-badge {
        position: absolute;
        top: 1rem;
        left: 1rem;
        padding: 0.4rem 0.8rem;
        border-radius: 99px;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
      }
      .available {
        background: rgba(212, 175, 55, 0.15);
        color: var(--lux-accent);
        border: 1px solid rgba(212, 175, 55, 0.3);
      }
      .unavailable {
        background: rgba(255, 255, 255, 0.05);
        color: var(--lux-text-muted);
        border: 1px solid var(--lux-border);
      }
      .lux-vehicle-info {
        padding: 1.5rem;
      }
      .vehicle-title {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1rem;
      }
      .vehicle-title h3 {
        font-size: 1.2rem;
      }
      .vehicle-price strong {
        font-size: 1.3rem;
        color: var(--lux-accent);
      }
      .vehicle-specs {
        display: flex;
        gap: 1rem;
        margin-bottom: 1.5rem;
        color: var(--lux-text-muted);
        font-size: 0.85rem;
        align-items: center;
      }
      .category-tag {
        background: var(--lux-surface-alt);
        padding: 0.2rem 0.6rem;
        border-radius: 4px;
        font-size: 0.75rem;
        text-transform: capitalize;
      }
      .full-width {
        width: 100%;
      }
      .lux-btn-outline:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .lux-alert-error {
        background-color: rgba(220, 53, 69, 0.1);
        color: #ff6b6b;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 2rem;
      }
      .lux-empty-state {
        text-align: center;
        padding: 4rem;
        background: var(--lux-surface);
        border-radius: var(--lux-radius);
        border: 1px dashed var(--lux-border);
      }
      .lux-empty-state i {
        font-size: 3rem;
        color: var(--lux-text-muted);
        margin-bottom: 1rem;
        display: block;
      }
      .lux-skeleton-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 2rem;
      }
      .lux-skeleton-card {
        height: 380px;
        background: var(--lux-surface);
        border-radius: var(--lux-radius);
        animation: pulse 1.5s infinite;
      }
      @keyframes pulse {
        0% {
          opacity: 0.6;
        }
        50% {
          opacity: 0.3;
        }
        100% {
          opacity: 0.6;
        }
      }

      /* ===== MODAL RESERVATION PREMIUM ===== */
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(8px);
        z-index: 1050;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        animation: fadeIn 0.25s ease;
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }

      .modal-container {
        background: #000000;
        border: 1px solid #222;
        border-radius: 20px;
        width: 100%;
        max-width: 520px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 25px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(212,175,55,0.08);
        animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        overflow: hidden;
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(30px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }

      /* Header */
      .modal-header {
        padding: 1.75rem 1.75rem 0;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        background: #000;
      }
      .header-vehicle {
        flex: 1;
        min-width: 0;
      }
      .header-category {
        display: inline-block;
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        color: var(--lux-accent, #d4af37);
        background: rgba(212, 175, 55, 0.08);
        padding: 0.25rem 0.6rem;
        border-radius: 99px;
        margin-bottom: 0.5rem;
      }
      .header-vehicle h3 {
        margin: 0;
        font-size: 1.35rem;
        font-weight: 700;
        color: var(--lux-heading, #f0f0f0);
        line-height: 1.2;
      }
      .header-price {
        margin: 0.35rem 0 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--lux-accent, #d4af37);
      }
      .header-price span {
        font-size: 0.8rem;
        font-weight: 400;
        color: var(--lux-text-muted, #888);
      }
      .modal-close-btn {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        border: 1px solid var(--lux-border, #2a2a2a);
        background: var(--lux-bg, #1a1a1a);
        color: var(--lux-text-muted, #888);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        flex-shrink: 0;
      }
      .modal-close-btn:hover {
        border-color: var(--lux-accent, #d4af37);
        color: var(--lux-accent, #d4af37);
        background: rgba(212, 175, 55, 0.06);
      }

      /* Body */
      .modal-body {
        padding: 1.5rem 1.75rem;
        overflow-y: auto;
        flex: 1;
        background: #000;
      }

      /* Vehicle preview */
      .vehicle-preview {
        display: flex;
        align-items: center;
        gap: 1rem;
        background: #0a0a0a;
        border: 1px solid #1a1a1a;
        border-radius: 14px;
        padding: 1rem;
        margin-bottom: 1.5rem;
      }
      .vehicle-preview img {
        width: 80px;
        height: 60px;
        object-fit: contain;
        border-radius: 10px;
        background: var(--lux-surface-alt, #181818);
        padding: 0.4rem;
        flex-shrink: 0;
      }
      .vehicle-preview-meta {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .vehicle-preview-meta .plate {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--lux-text-muted, #888);
        font-family: monospace;
        letter-spacing: 0.05em;
      }
      .vehicle-preview-meta .status-badge {
        display: inline-block;
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        padding: 0.3rem 0.7rem;
        border-radius: 99px;
        width: fit-content;
      }
      .status-badge.available {
        color: #0a0a0a;
        background: #d4af37;
        border: 1px solid #c9a227;
      }
      .status-badge.rented {
        color: #fff;
        background: #8b1a1a;
        border: 1px solid #a02020;
      }
      .status-badge.maintenance {
        color: #0a0a0a;
        background: #e6a817;
        border: 1px solid #d49b15;
      }

      /* Renter card */
      .renter-card {
        display: flex;
        align-items: center;
        gap: 0.85rem;
        background: #0a0a0a;
        border: 1px solid #1a1a1a;
        border-radius: 12px;
        padding: 1rem;
        margin-bottom: 1.5rem;
      }
      .renter-icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: rgba(212, 175, 55, 0.1);
        color: var(--lux-accent, #d4af37);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .renter-info {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        min-width: 0;
      }
      .renter-info strong {
        font-size: 0.9rem;
        color: var(--lux-heading, #f0f0f0);
        font-weight: 600;
      }
      .renter-info span {
        font-size: 0.78rem;
        color: var(--lux-text-muted, #888);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* Booking form */
      .booking-form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      /* Date grid */
      .catalogue-layout {
        display: grid;
        grid-template-columns: 280px 1fr;
        gap: 2.5rem;
        align-items: start;
      }
      
      @media (max-width: 900px) {
        .catalogue-layout {
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        .filters-panel {
          position: relative;
          top: 0;
        }
      }

      /* Filters Panel */
      .date-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }
      @media (max-width: 480px) {
        .date-grid { grid-template-columns: 1fr; }
        .modal-container { max-height: 95vh; border-radius: 16px; }
      }
      .date-field {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }
      .date-field label {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.78rem;
        font-weight: 600;
        color: var(--lux-text-muted, #888);
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .date-field label svg {
        color: var(--lux-accent, #d4af37);
        opacity: 0.8;
      }
      .date-field input[type='date'] {
        background: #0a0a0a;
        border: 1px solid #222;
        border-radius: 10px;
        padding: 0.85rem 1rem;
        color: #e0e0e0;
        font-family: inherit;
        font-size: 0.95rem;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
        width: 100%;
        cursor: pointer;
      }
      .date-field input[type='date']:hover {
        border-color: #d4af37;
      }
      .date-field input[type='date']:focus {
        border-color: #d4af37;
        box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.12);
      }
      .date-field.has-error input[type='date'] {
        border-color: #e74c3c;
        box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
      }

      /* Availability badge */
      .availability-badge {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.7rem 1rem;
        border-radius: 10px;
        font-size: 0.85rem;
        font-weight: 500;
      }
      .availability-badge.ok {
        color: #2ecc71;
        background: rgba(46, 204, 113, 0.08);
        border: 1px solid rgba(46, 204, 113, 0.15);
      }
      .availability-badge.ko {
        color: #e74c3c;
        background: rgba(231, 76, 60, 0.08);
        border: 1px solid rgba(231, 76, 60, 0.15);
      }

      /* Price card */
      .price-card {
        background: #0a0a0a;
        border: 1px solid #1a1a1a;
        border-radius: 14px;
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }
      .price-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.88rem;
        color: var(--lux-text-muted, #888);
      }
      .price-row.total {
        font-size: 1rem;
        color: var(--lux-text, #e0e0e0);
        font-weight: 600;
      }
      .price-row.total strong {
        font-size: 1.35rem;
        color: var(--lux-accent, #d4af37);
        font-weight: 700;
      }
      .price-divider {
        height: 1px;
        background: #222;
        margin: 0.3rem 0;
      }
      .price-disclaimer {
        margin: 0.3rem 0 0;
        font-size: 0.72rem;
        color: var(--lux-text-muted, #666);
        text-align: center;
      }

      /* Form messages */
      .form-message {
        display: flex;
        align-items: flex-start;
        gap: 0.6rem;
        padding: 0.8rem 1rem;
        border-radius: 10px;
        font-size: 0.85rem;
        line-height: 1.5;
      }
      .form-message.success {
        color: #2ecc71;
        background: rgba(46, 204, 113, 0.08);
        border: 1px solid rgba(46, 204, 113, 0.15);
      }
      .form-message.danger {
        color: #ff6b6b;
        background: rgba(220, 53, 69, 0.08);
        border: 1px solid rgba(220, 53, 69, 0.15);
      }
      .form-message.warning {
        color: #f1c40f;
        background: rgba(241, 196, 15, 0.08);
        border: 1px solid rgba(241, 196, 15, 0.15);
      }
      .form-message svg {
        flex-shrink: 0;
        margin-top: 0.1rem;
      }
      .form-message .profile-link {
        display: block;
        margin-top: 0.4rem;
        color: var(--lux-accent, #d4af37);
        font-weight: 600;
        text-decoration: none;
      }
      .form-message .profile-link:hover {
        text-decoration: underline;
      }

      /* Footer */
      .modal-footer {
        padding: 1.25rem 1.75rem;
        display: flex;
        gap: 0.75rem;
        border-top: 1px solid #1a1a1a;
        background: #000;
      }
      .btn-cancel {
        flex: 1;
        padding: 0.9rem 1.25rem;
        border-radius: 12px;
        border: 1px solid #333;
        background: #0a0a0a;
        color: #888;
        font-family: inherit;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      .btn-cancel:hover {
        border-color: #555;
        color: #e0e0e0;
        background: #111;
      }
      .btn-confirm {
        flex: 2;
        padding: 0.9rem 1.25rem;
        border-radius: 12px;
        border: none;
        background: #d4af37;
        color: #000;
        font-family: inherit;
        font-size: 0.9rem;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        transition: all 0.2s;
        box-shadow: 0 4px 20px rgba(212, 175, 55, 0.3);
      }
      .btn-confirm:hover:not(:disabled) {
        background: #e5c04a;
        transform: translateY(-1px);
        box-shadow: 0 6px 24px rgba(212, 175, 55, 0.4);
      }
      .btn-confirm:active:not(:disabled) {
        transform: translateY(0);
      }
      .btn-confirm:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        box-shadow: none;
        background: #8a7a4a;
        color: #222;
      }
      .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(10,10,10,0.3);
        border-top-color: #0a0a0a;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
        display: inline-block;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      /* Legacy alerts (used outside modal) */
      .lux-alert-error {
        background-color: rgba(220, 53, 69, 0.1);
        color: #ff6b6b;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 2rem;
      }
      .field-hint {
        font-size: 0.78rem;
        margin-top: 0.3rem;
      }
      .field-hint.error {
        color: #ff6b6b;
      }

      /* Responsive Modal */
      @media (max-width: 768px) {
        .modal-container { max-width: 100%; border-radius: 12px 12px 0 0; align-self: flex-end; margin-top: auto; }
        .modal-overlay { padding: 0; align-items: flex-end; }
        .modal-header { padding: 1.25rem 1.25rem 0; }
        .modal-body { padding: 1.25rem; }
        .form-grid { grid-template-columns: 1fr !important; gap: 0.75rem !important; }
        .date-grid { grid-template-columns: 1fr !important; gap: 0.75rem !important; }
      }
    `,
  ],
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
      this.prixMax.set(values.prixMax ?? 1000);
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
      this.bookingMessage.set(
        'Choisissez une période valide (fin après le début, début non passée).',
      );
      this.bookingForm.markAllAsTouched();
      return;
    }

    if (this.availabilityOk() === false) {
      this.bookingTone.set('warning');
      this.bookingMessage.set(
        this.availabilityMessage() || 'Véhicule indisponible sur cette période.',
      );
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
