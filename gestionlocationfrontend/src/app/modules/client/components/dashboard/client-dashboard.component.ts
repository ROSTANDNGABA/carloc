import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent } from '../../../../shared/components/card.component';

/**
 * Dashboard Client
 * Vue personnelle des réservations et factures
 */
@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, CardComponent],
  template: `
    <div class="space-y-8 pb-20">
      <!-- Welcome Section -->
      <div class="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl text-white p-8">
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-3xl font-bold mb-2">Bienvenue, Marie 👋</h1>
            <p class="text-blue-100 text-lg">Voici un résumé de vos activités récentes</p>
          </div>
          <button class="px-6 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition-colors">
            Nouvelle Réservation
          </button>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg p-4 border border-gray-200">
          <p class="text-gray-600 text-sm font-medium">Réservations Actives</p>
          <p class="text-2xl font-bold text-gray-900 mt-2">2</p>
        </div>
        <div class="bg-white rounded-lg p-4 border border-gray-200">
          <p class="text-gray-600 text-sm font-medium">Total Dépensé</p>
          <p class="text-2xl font-bold text-gray-900 mt-2">425K FCFA</p>
        </div>
        <div class="bg-white rounded-lg p-4 border border-gray-200">
          <p class="text-gray-600 text-sm font-medium">Factures en Attente</p>
          <p class="text-2xl font-bold text-red-600 mt-2">1</p>
        </div>
        <div class="bg-white rounded-lg p-4 border border-gray-200">
          <p class="text-gray-600 text-sm font-medium">Points Fidélité</p>
          <p class="text-2xl font-bold text-amber-600 mt-2">850 pts</p>
        </div>
      </div>

      <!-- Current Rentals -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold text-gray-900">Mes Réservations Actives</h2>
          <a href="/client/reservations" class="text-blue-600 hover:text-blue-700 font-medium text-sm">Voir tout →</a>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Rental Card 1 -->
          <app-card>
            <div class="p-6">
              <div class="flex items-start justify-between mb-4">
                <div>
                  <h3 class="text-lg font-bold text-gray-900">Mercedes GLA 200</h3>
                  <p class="text-gray-600 text-sm">Réservation #RES-2025-0145</p>
                </div>
                <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">Actif</span>
              </div>

              <div class="relative h-32 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                <svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              </div>

              <div class="space-y-2 mb-4 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">Période</span>
                  <span class="font-medium text-gray-900">10 - 14 juin 2025</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Montant Total</span>
                  <span class="font-medium text-gray-900">250 000 FCFA</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Retour prévu</span>
                  <span class="font-medium text-gray-900">14 juin à 10h</span>
                </div>
              </div>

              <div class="flex gap-2">
                <button class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
                  Détails
                </button>
                <button class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors">
                  Contrat
                </button>
              </div>
            </div>
          </app-card>

          <!-- Rental Card 2 -->
          <app-card>
            <div class="p-6">
              <div class="flex items-start justify-between mb-4">
                <div>
                  <h3 class="text-lg font-bold text-gray-900">Toyota Corolla</h3>
                  <p class="text-gray-600 text-sm">Réservation #RES-2025-0148</p>
                </div>
                <span class="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-semibold">En Attente</span>
              </div>

              <div class="relative h-32 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                <svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 2m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>

              <div class="space-y-2 mb-4 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">Période</span>
                  <span class="font-medium text-gray-900">15 - 18 juin 2025</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Montant Total</span>
                  <span class="font-medium text-gray-900">180 000 FCFA</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Confirmation</span>
                  <span class="font-medium text-yellow-700">À confirmer</span>
                </div>
              </div>

              <div class="flex gap-2">
                <button class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
                  Confirmer
                </button>
                <button class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors">
                  Annuler
                </button>
              </div>
            </div>
          </app-card>
        </div>
      </div>

      <!-- Recent Invoices -->
      <app-card>
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold text-gray-900">Factures Récentes</h2>
            <a href="/client/factures" class="text-blue-600 hover:text-blue-700 font-medium text-sm">Voir tout →</a>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-red-100/50 rounded-lg border border-red-200">
              <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-red-200 flex items-center justify-center">
                  <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <p class="font-semibold text-gray-900">Facture #INV-2025-0856</p>
                  <p class="text-sm text-gray-600">Mercedes GLA - 10 au 14 juin</p>
                </div>
              </div>
              <div class="text-right">
                <p class="font-bold text-red-700">À payer</p>
                <p class="text-xs text-gray-600">250 000 FCFA</p>
              </div>
            </div>

            <div class="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100/50 rounded-lg border border-green-200">
              <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-green-200 flex items-center justify-center">
                  <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                </div>
                <div>
                  <p class="font-semibold text-gray-900">Facture #INV-2025-0812</p>
                  <p class="text-sm text-gray-600">Honda Civic - 5 au 8 juin</p>
                </div>
              </div>
              <div class="text-right">
                <p class="font-bold text-green-700">Payée</p>
                <p class="text-xs text-gray-600">175 000 FCFA</p>
              </div>
            </div>
          </div>
        </div>
      </app-card>

      <!-- Testimonials / Benefits -->
      <app-card>
        <div class="p-6">
          <h2 class="text-lg font-bold text-gray-900 mb-4">Avantages Clients CarLoc</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="text-center">
              <svg class="w-12 h-12 text-blue-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p class="font-semibold text-gray-900">Assurance Complète</p>
              <p class="text-sm text-gray-600 mt-1">Tous nos véhicules sont assuré</p>
            </div>
            <div class="text-center">
              <svg class="w-12 h-12 text-green-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              <p class="font-semibold text-gray-900">Service 24/7</p>
              <p class="text-sm text-gray-600 mt-1">Support toujours disponible</p>
            </div>
            <div class="text-center">
              <svg class="w-12 h-12 text-purple-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p class="font-semibold text-gray-900">Tarifs Compétitifs</p>
              <p class="text-sm text-gray-600 mt-1">Les meilleurs prix du marché</p>
            </div>
          </div>
        </div>
      </app-card>
    </div>
  `,
})
export class ClientDashboardComponent implements OnInit {
  ngOnInit(): void {
    // Initialize client dashboard data
  }
}
