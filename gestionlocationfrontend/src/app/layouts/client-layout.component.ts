import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

/**
 * Layout Client - Interface personnelle
 * Accès aux propres réservations, factures et profil
 */
@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <!-- Header -->
      <header class="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div class="h-16 px-6 flex items-center justify-between max-w-7xl mx-auto">
          <!-- Logo & Branding -->
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <span class="text-white font-bold text-lg">C</span>
            </div>
            <div>
              <h1 class="text-gray-900 font-bold text-lg">CarLoc</h1>
              <p class="text-gray-500 text-xs">Votre espace personnel</p>
            </div>
          </div>

          <!-- Navigation Center -->
          <nav class="hidden md:flex items-center gap-8">
            <a href="/client/catalogue" class="text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors">
              Catalogues
            </a>
            <a href="/client/reservations" class="text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors">
              Mes Réservations
            </a>
            <a href="/client/factures" class="text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors">
              Factures
            </a>
          </nav>

          <!-- User Actions -->
          <div class="flex items-center gap-4">
            <button class="p-2 hover:bg-gray-100 rounded-lg transition-colors relative" title="Notifications">
              <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
              <span class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            <!-- User Profile Dropdown -->
            <div class="flex items-center gap-2 pl-4 border-l border-gray-200">
              <div class="text-right">
                <p class="text-gray-900 font-medium text-sm">Marie Durand</p>
                <p class="text-gray-500 text-xs">Client</p>
              </div>
              <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                MD
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <div class="max-w-7xl mx-auto" [@fadeInAnimation]>
        <main class="py-6 px-6">
          <router-outlet></router-outlet>
        </main>
      </div>

      <!-- Mobile Bottom Nav -->
      <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
        <div class="flex justify-around h-16">
          <a href="/client/catalogue" class="flex items-center justify-center flex-col gap-1 flex-1 text-blue-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
            </svg>
            <span class="text-xs font-medium">Catalogues</span>
          </a>

          <a href="/client/reservations" class="flex items-center justify-center flex-col gap-1 flex-1 text-gray-400">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <span class="text-xs font-medium">Réservations</span>
          </a>

          <a href="/client/factures" class="flex items-center justify-center flex-col gap-1 flex-1 text-gray-400">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <span class="text-xs font-medium">Factures</span>
          </a>

          <a href="/client/profil" class="flex items-center justify-center flex-col gap-1 flex-1 text-gray-400">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            <span class="text-xs font-medium">Profil</span>
          </a>
        </div>
      </nav>

      <!-- Footer -->
      <footer class="bg-white border-t border-gray-200 mt-12 py-8">
        <div class="max-w-7xl mx-auto px-6 text-center text-gray-600 text-sm">
          <p>&copy; 2025 CarLoc - Tous droits réservés | 
            <a href="#" class="text-blue-600 hover:underline">Conditions d'utilisation</a> | 
            <a href="#" class="text-blue-600 hover:underline">Confidentialité</a> |
            <button
              type="button"
              (click)="logout()"
              class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
            >
              Déconnexion
            </button>
          </p>
        </div>
      </footer>
    </div>

    <style>
      :host ::ng-deep {
        body {
          background-color: #f9fafb;
        }
      }
    </style>
  `,
})
export class ClientLayoutComponent {
  constructor(private router: Router) {}

  logout(): void {
    // TODO: Integrate with AuthService
    this.router.navigate(['/login']);
  }
}
