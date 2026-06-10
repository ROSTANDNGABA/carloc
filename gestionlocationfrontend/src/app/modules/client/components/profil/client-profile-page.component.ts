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
    <div class="max-w-4xl mx-auto px-4 sm:px-6 space-y-4 animate-fade-in">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-200 dark:border-carloc-800 pb-4">
        <div>
          <h2 class="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">Mon profil</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Informations personnelles et documents.</p>
        </div>
      </div>

      <div class="w-full">
        @if (loading()) {
          <div class="flex flex-col items-center justify-center p-12 py-24 text-gray-500 dark:text-gray-400 gap-4">
            <i class="bi bi-arrow-repeat animate-spin text-4xl"></i>
            <span class="font-semibold text-lg">Chargement du profil...</span>
          </div>
        } @else if (client(); as c) {
          <div class="bg-white dark:bg-carloc-900 border border-gray-200 dark:border-carloc-800 rounded-xl overflow-hidden shadow-sm">
            
            <!-- Profile Header Card -->
            <div class="flex flex-col sm:flex-row items-center gap-4 p-4 sm:p-5 border-b border-gray-200 dark:border-carloc-800 bg-gray-50/50 dark:bg-carloc-900/50 relative">
              <div class="relative w-20 h-20 rounded-full border-4 border-white dark:border-carloc-800 shadow-md overflow-hidden bg-gray-100 dark:bg-carloc-800 shrink-0">
                <img
                  [src]="avatar(c)"
                  alt="Photo de profil"
                  class="w-full h-full object-cover"
                  (error)="onAvatarError($event)"
                />
                @if (editing()) {
                  <div class="absolute inset-0 bg-carloc-950/60 flex items-center justify-center cursor-pointer transition-colors hover:bg-carloc-950/70">
                    <i class="bi bi-camera text-white text-3xl"></i>
                  </div>
                }
              </div>
              
              <div class="flex-1 text-center sm:text-left min-w-0">
                <h3 class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-2 truncate">{{ c.prenom }} {{ c.nom }}</h3>
                <span class="inline-block px-3 py-1 bg-carloc-900 dark:bg-white text-white dark:text-carloc-950 text-xs font-bold rounded-full tracking-wide">COMPTE CLIENT</span>
              </div>

              @if (!editing()) {
                <button
                  type="button"
                  (click)="toggleEdit()"
                  class="mt-3 sm:mt-0 px-4 py-2.5 bg-carloc-900 dark:bg-white text-white dark:text-carloc-950 font-bold rounded-lg hover:bg-carloc-800 dark:hover:bg-gray-200 transition-all shadow-md flex items-center gap-2"
                >
                  <i class="bi bi-pencil-square"></i>
                  Modifier
                </button>
              }
            </div>

            <!-- Profile Form (Edit Mode) -->
            @if (editing()) {
              <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="p-4 sm:p-5 space-y-5">
                
                @if (error()) {
                  <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 px-6 py-4 rounded-xl flex items-center gap-3">
                    <i class="bi bi-exclamation-triangle-fill text-xl"></i>
                    <span class="font-medium">{{ error() }}</span>
                  </div>
                }
                @if (message()) {
                  <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30 text-green-700 dark:text-green-400 px-6 py-4 rounded-xl flex items-center gap-3">
                    <i class="bi bi-check-circle-fill text-xl"></i>
                    <span class="font-medium">{{ message() }}</span>
                  </div>
                }

                <!-- Informations Personnelles -->
                <div class="space-y-4">
                  <div class="flex items-center gap-3 border-b border-gray-100 dark:border-carloc-800 pb-2">
                    <div class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-carloc-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
                      <i class="bi bi-person text-lg"></i>
                    </div>
                    <h4 class="text-base font-bold text-gray-900 dark:text-white">Informations personnelles</h4>
                  </div>
                  
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Prénom -->
                    <div class="space-y-2">
                      <label for="prenom" class="block text-sm font-semibold text-gray-700 dark:text-gray-300">Prénom</label>
                      <input type="text" id="prenom" formControlName="prenom" class="w-full bg-gray-50 dark:bg-carloc-800/50 border border-gray-300 dark:border-carloc-700 text-gray-900 dark:text-white px-3 py-2.5 rounded-lg focus:outline-none focus:border-carloc-900 dark:focus:border-white focus:ring-1 focus:ring-carloc-900 dark:focus:ring-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600" placeholder="Votre prénom" />
                      @if (profileForm.get('prenom')?.touched && profileForm.get('prenom')?.invalid) {
                        <span class="text-red-500 dark:text-red-400 text-xs font-semibold mt-1 block">Prénom obligatoire</span>
                      }
                    </div>
                    <!-- Nom -->
                    <div class="space-y-2">
                      <label for="nom" class="block text-sm font-semibold text-gray-700 dark:text-gray-300">Nom</label>
                      <input type="text" id="nom" formControlName="nom" class="w-full bg-gray-50 dark:bg-carloc-800/50 border border-gray-300 dark:border-carloc-700 text-gray-900 dark:text-white px-3 py-2.5 rounded-lg focus:outline-none focus:border-carloc-900 dark:focus:border-white focus:ring-1 focus:ring-carloc-900 dark:focus:ring-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600" placeholder="Votre nom" />
                      @if (profileForm.get('nom')?.touched && profileForm.get('nom')?.invalid) {
                        <span class="text-red-500 dark:text-red-400 text-xs font-semibold mt-1 block">Nom obligatoire</span>
                      }
                    </div>
                    <!-- Email -->
                    <div class="space-y-2">
                      <label for="email" class="block text-sm font-semibold text-gray-700 dark:text-gray-300">Email</label>
                      <input type="email" id="email" formControlName="email" class="w-full bg-gray-50 dark:bg-carloc-800/50 border border-gray-300 dark:border-carloc-700 text-gray-900 dark:text-white px-3 py-2.5 rounded-lg focus:outline-none focus:border-carloc-900 dark:focus:border-white focus:ring-1 focus:ring-carloc-900 dark:focus:ring-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600" placeholder="Votre email" />
                      @if (profileForm.get('email')?.touched && profileForm.get('email')?.invalid) {
                        <span class="text-red-500 dark:text-red-400 text-xs font-semibold mt-1 block">Email valide obligatoire</span>
                      }
                    </div>
                    <!-- Téléphone -->
                    <div class="space-y-2">
                      <label for="telephone" class="block text-sm font-semibold text-gray-700 dark:text-gray-300">Téléphone</label>
                      <input type="text" id="telephone" formControlName="telephone" class="w-full bg-gray-50 dark:bg-carloc-800/50 border border-gray-300 dark:border-carloc-700 text-gray-900 dark:text-white px-3 py-2.5 rounded-lg focus:outline-none focus:border-carloc-900 dark:focus:border-white focus:ring-1 focus:ring-carloc-900 dark:focus:ring-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600" placeholder="Votre numéro" />
                      @if (profileForm.get('telephone')?.touched && profileForm.get('telephone')?.invalid) {
                        <span class="text-red-500 dark:text-red-400 text-xs font-semibold mt-1 block">Téléphone obligatoire</span>
                      }
                    </div>
                    <!-- Adresse -->
                    <div class="space-y-2 md:col-span-2">
                      <label for="adresse" class="block text-sm font-semibold text-gray-700 dark:text-gray-300">Adresse</label>
                      <input type="text" id="adresse" formControlName="adresse" class="w-full bg-gray-50 dark:bg-carloc-800/50 border border-gray-300 dark:border-carloc-700 text-gray-900 dark:text-white px-3 py-2.5 rounded-lg focus:outline-none focus:border-carloc-900 dark:focus:border-white focus:ring-1 focus:ring-carloc-900 dark:focus:ring-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600" placeholder="Votre adresse complète" />
                    </div>
                    <!-- CNI -->
                    <div class="space-y-2">
                      <label for="num_cni" class="block text-sm font-semibold text-gray-700 dark:text-gray-300">Numéro CNI</label>
                      <input type="text" id="num_cni" formControlName="num_cni" class="w-full bg-gray-50 dark:bg-carloc-800/50 border border-gray-300 dark:border-carloc-700 text-gray-900 dark:text-white px-3 py-2.5 rounded-lg focus:outline-none focus:border-carloc-900 dark:focus:border-white focus:ring-1 focus:ring-carloc-900 dark:focus:ring-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 uppercase" placeholder="Numéro de carte d'identité" />
                    </div>
                    <!-- Permis -->
                    <div class="space-y-2">
                      <label for="num_permis" class="block text-sm font-semibold text-gray-700 dark:text-gray-300">Numéro de Permis</label>
                      <input type="text" id="num_permis" formControlName="num_permis" class="w-full bg-gray-50 dark:bg-carloc-800/50 border border-gray-300 dark:border-carloc-700 text-gray-900 dark:text-white px-3 py-2.5 rounded-lg focus:outline-none focus:border-carloc-900 dark:focus:border-white focus:ring-1 focus:ring-carloc-900 dark:focus:ring-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 uppercase" placeholder="Numéro de permis" />
                      @if (profileForm.get('num_permis')?.touched && profileForm.get('num_permis')?.invalid) {
                        <span class="text-red-500 dark:text-red-400 text-xs font-semibold mt-1 block">Numéro de permis obligatoire</span>
                      }
                    </div>
                  </div>
                </div>

                <!-- Sécurité -->
                <div class="space-y-4">
                  <div class="flex items-center gap-3 border-b border-gray-100 dark:border-carloc-800 pb-2">
                    <div class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-carloc-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
                      <i class="bi bi-shield-lock text-lg"></i>
                    </div>
                    <h4 class="text-base font-bold text-gray-900 dark:text-white">Sécurité</h4>
                  </div>
                  
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-2">
                      <label for="mot_de_passe" class="block text-sm font-semibold text-gray-700 dark:text-gray-300">Nouveau Mot de passe (optionnel)</label>
                      <input type="password" id="mot_de_passe" formControlName="mot_de_passe" class="w-full bg-gray-50 dark:bg-carloc-800/50 border border-gray-300 dark:border-carloc-700 text-gray-900 dark:text-white px-3 py-2.5 rounded-lg focus:outline-none focus:border-carloc-900 dark:focus:border-white focus:ring-1 focus:ring-carloc-900 dark:focus:ring-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 tracking-widest" placeholder="••••••••" />
                    </div>
                    <div class="space-y-2">
                      <label for="confirmation_mot_de_passe" class="block text-sm font-semibold text-gray-700 dark:text-gray-300">Confirmer le mot de passe</label>
                      <input type="password" id="confirmation_mot_de_passe" formControlName="confirmation_mot_de_passe" class="w-full bg-gray-50 dark:bg-carloc-800/50 border border-gray-300 dark:border-carloc-700 text-gray-900 dark:text-white px-3 py-2.5 rounded-lg focus:outline-none focus:border-carloc-900 dark:focus:border-white focus:ring-1 focus:ring-carloc-900 dark:focus:ring-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 tracking-widest" placeholder="••••••••" />
                    </div>
                  </div>
                </div>

                <!-- Photo de Profil -->
                <div class="space-y-4">
                  <div class="flex items-center gap-3 border-b border-gray-100 dark:border-carloc-800 pb-2">
                    <div class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-carloc-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
                      <i class="bi bi-image text-lg"></i>
                    </div>
                    <h4 class="text-base font-bold text-gray-900 dark:text-white">Photo de profil</h4>
                  </div>
                  
                  <div class="w-full">
                    <div class="relative border-2 border-dashed border-gray-300 dark:border-carloc-700 rounded-xl p-6 text-center bg-gray-50/50 dark:bg-carloc-800/30 hover:border-carloc-500 dark:hover:border-gray-500 transition-colors group cursor-pointer">
                      <i class="bi bi-cloud-arrow-up text-3xl text-gray-400 dark:text-gray-500 group-hover:text-carloc-500 dark:group-hover:text-gray-300 transition-colors mb-2 block"></i>
                      <p class="font-bold text-gray-700 dark:text-gray-300 mb-1">Glissez et déposez votre image ici</p>
                      <p class="text-sm text-gray-500 dark:text-gray-500">ou cliquez pour parcourir</p>
                      <input type="file" (change)="onFileSelected($event)" accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    </div>

                    @if (selectedPhoto()) {
                      <div class="mt-4 flex items-center justify-between p-4 bg-gray-50 dark:bg-carloc-800 rounded-xl border border-gray-200 dark:border-carloc-700">
                        <div class="flex items-center gap-3 overflow-hidden">
                          <i class="bi bi-file-earmark-image text-xl text-gray-500 dark:text-gray-400 shrink-0"></i>
                          <span class="font-semibold text-gray-700 dark:text-gray-300 truncate">{{ selectedPhoto()?.name }}</span>
                        </div>
                        <button type="button" class="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0" (click)="removeFile()">
                          <i class="bi bi-x-lg text-lg"></i>
                        </button>
                      </div>
                    }
                  </div>
                </div>

                <!-- Documents -->
                <div class="space-y-4">
                  <div class="flex items-center gap-3 border-b border-gray-100 dark:border-carloc-800 pb-2">
                    <div class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-carloc-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
                      <i class="bi bi-file-earmark-text text-lg"></i>
                    </div>
                    <h4 class="text-base font-bold text-gray-900 dark:text-white">Documents officiels</h4>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="rounded-xl border border-dashed border-gray-300 dark:border-carloc-700 bg-gray-50/50 dark:bg-carloc-800/30 p-4 relative">
                      <i class="bi bi-award text-2xl text-gray-400 dark:text-gray-500"></i>
                      <p class="font-bold text-gray-900 dark:text-white mt-3">Permis de conduire</p>
                      <p class="text-sm text-gray-500 dark:text-gray-400">{{ c.permis_conduire ? 'Document déjà enregistré' : 'Ajoutez une image ou un PDF' }}</p>
                      <input type="file" (change)="onDocumentSelected($event, 'permis')" accept="application/pdf,image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      @if (selectedPermis()) {
                        <div class="mt-4 flex items-center justify-between gap-3 rounded-xl bg-white dark:bg-carloc-900 border border-gray-200 dark:border-carloc-700 p-3">
                          <span class="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{{ selectedPermis()?.name }}</span>
                          <button type="button" class="text-red-500 shrink-0" (click)="removeDocument('permis')"><i class="bi bi-x-lg"></i></button>
                        </div>
                      }
                    </div>

                    <div class="rounded-xl border border-dashed border-gray-300 dark:border-carloc-700 bg-gray-50/50 dark:bg-carloc-800/30 p-4 relative">
                      <i class="bi bi-card-heading text-2xl text-gray-400 dark:text-gray-500"></i>
                      <p class="font-bold text-gray-900 dark:text-white mt-3">Pièce d'identité</p>
                      <p class="text-sm text-gray-500 dark:text-gray-400">{{ c.piece_identite ? 'Document déjà enregistré' : 'Ajoutez une image ou un PDF' }}</p>
                      <input type="file" (change)="onDocumentSelected($event, 'identite')" accept="application/pdf,image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      @if (selectedIdentite()) {
                        <div class="mt-4 flex items-center justify-between gap-3 rounded-xl bg-white dark:bg-carloc-900 border border-gray-200 dark:border-carloc-700 p-3">
                          <span class="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{{ selectedIdentite()?.name }}</span>
                          <button type="button" class="text-red-500 shrink-0" (click)="removeDocument('identite')"><i class="bi bi-x-lg"></i></button>
                        </div>
                      }
                    </div>
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-gray-100 dark:border-carloc-800">
                  <button type="button" class="px-5 py-2.5 border border-gray-300 dark:border-carloc-700 text-gray-700 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-carloc-800 transition-colors" (click)="cancelEdit()">
                    Annuler
                  </button>
                  <button type="submit" class="px-6 py-2.5 bg-carloc-900 dark:bg-white text-white dark:text-carloc-950 font-bold rounded-lg hover:bg-carloc-800 dark:hover:bg-gray-200 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" [disabled]="saving()">
                    @if (saving()) {
                      <i class="bi bi-arrow-repeat animate-spin text-lg"></i>
                      Sauvegarde...
                    } @else {
                      <i class="bi bi-check-lg text-lg"></i>
                      Enregistrer
                    }
                  </button>
                </div>
              </form>
            } 
            
            <!-- Profile Details (View Mode) -->
            @else {
              <div class="p-4 sm:p-5 space-y-5">
                
                <!-- Contact Info -->
                <div class="space-y-4">
                  <div class="flex items-center gap-3 border-b border-gray-100 dark:border-carloc-800 pb-2">
                    <div class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-carloc-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
                      <i class="bi bi-person-lines-fill text-lg"></i>
                    </div>
                    <h4 class="text-base font-bold text-gray-900 dark:text-white">Informations de contact</h4>
                  </div>
                  
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div class="flex items-start gap-3 p-3.5 rounded-lg bg-gray-50/50 dark:bg-carloc-800/30 border border-gray-100 dark:border-carloc-800">
                      <div class="w-9 h-9 rounded-lg bg-white dark:bg-carloc-800 shadow-sm flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0 border border-gray-100 dark:border-carloc-700">
                        <i class="bi bi-envelope"></i>
                      </div>
                      <div class="min-w-0">
                        <span class="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Email</span>
                        <span class="block font-semibold text-gray-900 dark:text-gray-200 truncate">{{ c.email }}</span>
                      </div>
                    </div>
                    
                    <div class="flex items-start gap-3 p-3.5 rounded-lg bg-gray-50/50 dark:bg-carloc-800/30 border border-gray-100 dark:border-carloc-800">
                      <div class="w-9 h-9 rounded-lg bg-white dark:bg-carloc-800 shadow-sm flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0 border border-gray-100 dark:border-carloc-700">
                        <i class="bi bi-telephone"></i>
                      </div>
                      <div class="min-w-0">
                        <span class="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Téléphone</span>
                        <span class="block font-semibold text-gray-900 dark:text-gray-200 truncate">{{ c.telephone }}</span>
                      </div>
                    </div>
                    
                    <div class="flex items-start gap-3 p-3.5 rounded-lg bg-gray-50/50 dark:bg-carloc-800/30 border border-gray-100 dark:border-carloc-800">
                      <div class="w-9 h-9 rounded-lg bg-white dark:bg-carloc-800 shadow-sm flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0 border border-gray-100 dark:border-carloc-700">
                        <i class="bi bi-geo-alt"></i>
                      </div>
                      <div class="min-w-0">
                        <span class="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Adresse</span>
                        <span class="block font-semibold text-gray-900 dark:text-gray-200 truncate">{{ c.adresse || 'Non renseignée' }}</span>
                      </div>
                    </div>
                    <div class="flex items-start gap-3 p-3.5 rounded-lg bg-gray-50/50 dark:bg-carloc-800/30 border border-gray-100 dark:border-carloc-800">
                      <div class="w-9 h-9 rounded-lg bg-white dark:bg-carloc-800 shadow-sm flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0 border border-gray-100 dark:border-carloc-700">
                        <i class="bi bi-file-earmark-check"></i>
                      </div>
                      <div class="min-w-0">
                        <span class="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Permis de conduire</span>
                        <span class="block font-semibold text-gray-900 dark:text-gray-200 truncate">{{ c.permis_conduire ? 'Document enregistré' : 'Non renseigné' }}</span>
                      </div>
                    </div>
                    <div class="flex items-start gap-3 p-3.5 rounded-lg bg-gray-50/50 dark:bg-carloc-800/30 border border-gray-100 dark:border-carloc-800">
                      <div class="w-9 h-9 rounded-lg bg-white dark:bg-carloc-800 shadow-sm flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0 border border-gray-100 dark:border-carloc-700">
                        <i class="bi bi-file-earmark-person"></i>
                      </div>
                      <div class="min-w-0">
                        <span class="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Pièce d'identité</span>
                        <span class="block font-semibold text-gray-900 dark:text-gray-200 truncate">{{ c.piece_identite ? 'Document enregistré' : 'Non renseignée' }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Documents -->
                <div class="space-y-4">
                  <div class="flex items-center gap-3 border-b border-gray-100 dark:border-carloc-800 pb-2">
                    <div class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-carloc-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
                      <i class="bi bi-card-heading text-lg"></i>
                    </div>
                    <h4 class="text-base font-bold text-gray-900 dark:text-white">Documents officiels</h4>
                  </div>
                  
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div class="flex items-start gap-3 p-3.5 rounded-lg bg-gray-50/50 dark:bg-carloc-800/30 border border-gray-100 dark:border-carloc-800">
                      <div class="w-9 h-9 rounded-lg bg-white dark:bg-carloc-800 shadow-sm flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0 border border-gray-100 dark:border-carloc-700">
                        <i class="bi bi-card-text"></i>
                      </div>
                      <div class="min-w-0">
                        <span class="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Numéro CNI</span>
                        <span class="block font-semibold text-gray-900 dark:text-gray-200 uppercase truncate">{{ c.num_cni || 'Non renseigné' }}</span>
                      </div>
                    </div>
                    
                    <div class="flex items-start gap-3 p-3.5 rounded-lg bg-gray-50/50 dark:bg-carloc-800/30 border border-gray-100 dark:border-carloc-800">
                      <div class="w-9 h-9 rounded-lg bg-white dark:bg-carloc-800 shadow-sm flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0 border border-gray-100 dark:border-carloc-700">
                        <i class="bi bi-award"></i>
                      </div>
                      <div class="min-w-0">
                        <span class="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Numéro de Permis</span>
                        <span class="block font-semibold text-gray-900 dark:text-gray-200 uppercase truncate">{{ c.num_permis }}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            }
          </div>
        }
      </div>
    </div>
  `
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
  readonly selectedPermis = signal<File | null>(null);
  readonly selectedIdentite = signal<File | null>(null);
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
    const permis = this.selectedPermis();
    if (permis) {
      payload.append('permis_conduire', permis);
    }
    const identite = this.selectedIdentite();
    if (identite) {
      payload.append('piece_identite', identite);
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
          this.selectedPermis.set(null);
          this.selectedIdentite.set(null);
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

  onDocumentSelected(event: Event, type: 'permis' | 'identite'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (type === 'permis') {
      this.selectedPermis.set(file);
    } else {
      this.selectedIdentite.set(file);
    }
  }

  removeDocument(type: 'permis' | 'identite'): void {
    if (type === 'permis') {
      this.selectedPermis.set(null);
    } else {
      this.selectedIdentite.set(null);
    }
  }

  cancelEdit(): void {
    const client = this.client();
    if (client) {
      this.patchForm(client);
    }
    this.selectedPhoto.set(null);
    this.selectedPermis.set(null);
    this.selectedIdentite.set(null);
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
