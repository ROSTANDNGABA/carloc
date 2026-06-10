import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { AuthService } from '@app/auth/auth.service';
import { ClientHistorique, ClientService } from '@app/core/services/client.service';
import { extractApiError } from '@app/core/utils/api.util';
import { Client } from '@app/models/client.model';
import { money, shortDate, statusLabel, statusTone } from '@app/shared/formatters';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-client-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="space-y-8 animate-fade-in">
  @if (loading()) {
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      @for (i of [1,2,3,4]; track i) {
        <div class="bg-gray-100 dark:bg-carloc-800/50 rounded-2xl h-32 animate-pulse"></div>
      }
    </div>
  } @else {
    <div class="flex flex-col gap-2">
      <h2 class="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Bienvenue, {{ clientTitle() }}</h2>
      <p class="text-gray-500 dark:text-gray-400">Voici un résumé de votre activité de location avec CarLoc.</p>
    </div>
    
    <!-- Metrics Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- Active Reservations -->
      <div class="bg-white dark:bg-carloc-900 border border-gray-200 dark:border-carloc-800 rounded-2xl p-6 shadow-sm flex items-center gap-5 transition-transform hover:-translate-y-1">
        <div class="w-14 h-14 rounded-xl bg-gray-50 dark:bg-carloc-800 flex items-center justify-center text-gray-700 dark:text-gray-300 text-2xl">
          <i class="bi bi-car-front"></i>
        </div>
        <div>
          <p class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Réservations Actives</p>
          <strong class="text-2xl font-black text-gray-900 dark:text-white">{{ history()?.resume?.nb_reservations || 0 }}</strong>
        </div>
      </div>

      <!-- Pending Amount -->
      <div class="bg-white dark:bg-carloc-900 border border-gray-200 dark:border-carloc-800 rounded-2xl p-6 shadow-sm flex items-center gap-5 transition-transform hover:-translate-y-1">
        <div class="w-14 h-14 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400 text-2xl">
          <i class="bi bi-clock-history"></i>
        </div>
        <div>
          <p class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">En attente</p>
          <strong class="text-2xl font-black text-gray-900 dark:text-white">{{ history()?.resume?.solde_impaye || 0 }}</strong>
        </div>
      </div>

      <!-- Total Reservations -->
      <div class="bg-white dark:bg-carloc-900 border border-gray-200 dark:border-carloc-800 rounded-2xl p-6 shadow-sm flex items-center gap-5 transition-transform hover:-translate-y-1">
        <div class="w-14 h-14 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400 text-2xl">
          <i class="bi bi-check-circle"></i>
        </div>
        <div>
          <p class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total Réservations</p>
          <strong class="text-2xl font-black text-gray-900 dark:text-white">{{ history()?.resume?.nb_paiements || 0 }}</strong>
        </div>
      </div>

      <!-- Total Spent (Highlight) -->
      <div class="bg-carloc-950 dark:bg-white rounded-2xl p-6 shadow-xl flex items-center gap-5 transition-transform hover:-translate-y-1 relative overflow-hidden">
        <!-- Glow effect inside the dark card -->
        <div class="absolute -top-10 -right-10 w-32 h-32 bg-gray-700 dark:bg-gray-300 rounded-full mix-blend-screen filter blur-2xl opacity-40"></div>
        
        <div class="w-14 h-14 rounded-xl bg-gray-800 dark:bg-gray-100 flex items-center justify-center text-white dark:text-carloc-950 text-2xl relative z-10">
          <i class="bi bi-cash-coin"></i>
        </div>
        <div class="relative z-10">
          <p class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Total Dépensé</p>
          <strong class="text-2xl font-black text-white dark:text-carloc-950">{{ moneyFmt(history()?.resume?.total_depense || 0) }}</strong>
        </div>
      </div>
    </div>
    
    <!-- Lists Section -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
      
      <!-- Recent Reservations -->
      <section class="bg-white dark:bg-carloc-900 border border-gray-200 dark:border-carloc-800 rounded-3xl overflow-hidden shadow-sm flex flex-col">
        <div class="px-6 py-5 border-b border-gray-100 dark:border-carloc-800 flex justify-between items-center bg-gray-50/50 dark:bg-carloc-900/50">
          <h3 class="font-bold text-gray-900 dark:text-white text-lg">Réservations Récentes</h3>
          <a routerLink="/client/reservations" class="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-300 dark:border-carloc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-carloc-800 transition-colors">Tout voir</a>
        </div>
        <div class="p-0 flex-1">
          @if (history()?.reservations?.length) {
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th class="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-carloc-800 bg-white dark:bg-carloc-900">Véhicule</th>
                    <th class="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-carloc-800 bg-white dark:bg-carloc-900">Période</th>
                    <th class="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-carloc-800 bg-white dark:bg-carloc-900">Statut</th>
                    <th class="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-carloc-800 bg-white dark:bg-carloc-900">Montant</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-carloc-800">
                  @for (res of history()?.reservations; track res.id) {
                    <tr class="hover:bg-gray-50 dark:hover:bg-carloc-800/50 transition-colors">
                      <td class="px-6 py-4 whitespace-nowrap">
                        <strong class="text-gray-900 dark:text-white font-semibold">{{ res.vehicule }}</strong>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {{ dateFmt(res.date_debut) }} - {{ dateFmt(res.date_fin) }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span 
                          class="px-2.5 py-1 rounded-md text-xs font-bold"
                          [ngClass]="res.est_annulee ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'"
                        >
                          {{ res.est_annulee ? 'Annulée' : 'Active' }}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                        {{ moneyFmt(res.montant_du) }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="flex flex-col items-center justify-center p-12 text-center">
              <div class="w-16 h-16 bg-gray-100 dark:bg-carloc-800 rounded-2xl flex items-center justify-center text-gray-400 dark:text-gray-500 text-3xl mb-4">
                <i class="bi bi-calendar-x"></i>
              </div>
              <p class="text-gray-500 dark:text-gray-400 mb-6 font-medium">Vous n'avez aucune réservation récente.</p>
              <a routerLink="/catalogue" class="px-6 py-3 bg-carloc-900 dark:bg-white text-white dark:text-carloc-950 font-bold rounded-xl hover:bg-carloc-800 dark:hover:bg-gray-200 transition-colors shadow-md">
                Réserver un véhicule
              </a>
            </div>
          }
        </div>
      </section>
      
      <!-- Recent Invoices -->
      <section class="bg-white dark:bg-carloc-900 border border-gray-200 dark:border-carloc-800 rounded-3xl overflow-hidden shadow-sm flex flex-col">
        <div class="px-6 py-5 border-b border-gray-100 dark:border-carloc-800 flex justify-between items-center bg-gray-50/50 dark:bg-carloc-900/50">
          <h3 class="font-bold text-gray-900 dark:text-white text-lg">Dernières Factures</h3>
          <a routerLink="/client/factures" class="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-300 dark:border-carloc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-carloc-800 transition-colors">Tout voir</a>
        </div>
        <div class="p-0 flex-1">
          @if (history()?.factures?.length) {
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th class="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-carloc-800 bg-white dark:bg-carloc-900">Référence</th>
                    <th class="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-carloc-800 bg-white dark:bg-carloc-900">Date</th>
                    <th class="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-carloc-800 bg-white dark:bg-carloc-900">Statut</th>
                    <th class="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-carloc-800 bg-white dark:bg-carloc-900">Total</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-carloc-800">
                  @for (fac of history()?.factures; track fac.id) {
                    <tr class="hover:bg-gray-50 dark:hover:bg-carloc-800/50 transition-colors">
                      <td class="px-6 py-4 whitespace-nowrap">
                        <strong class="text-gray-900 dark:text-white font-semibold">{{ fac.numero }}</strong>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        —
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span 
                          class="px-2.5 py-1 rounded-md text-xs font-bold capitalize"
                          [ngClass]="{
                            'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400': fac.statut === 'payee',
                            'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400': fac.statut === 'impayee',
                            'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400': fac.statut === 'en_attente'
                          }"
                        >
                          {{ fac.statut }}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                        {{ moneyFmt(fac.montant_total) }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="flex flex-col items-center justify-center p-12 text-center h-full">
              <div class="w-16 h-16 bg-gray-100 dark:bg-carloc-800 rounded-2xl flex items-center justify-center text-gray-400 dark:text-gray-500 text-3xl mb-4">
                <i class="bi bi-receipt"></i>
              </div>
              <p class="text-gray-500 dark:text-gray-400 font-medium">Aucune facture récente.</p>
            </div>
          }
        </div>
      </section>
    </div>
  }
</div>
  `
})
export class ClientDashboardPageComponent {
  private readonly auth = inject(AuthService);
  private readonly clients = inject(ClientService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly client = signal<Client | null>(null);
  readonly history = signal<ClientHistorique | null>(null);

  readonly moneyFmt = money;
  readonly dateFmt = shortDate;
  readonly label = statusLabel;
  readonly tone = statusTone;

  constructor() {
    this.load();
  }

  clientTitle(): string {
    const client = this.client();
    if (client) return `${client.prenom} ${client.nom}`;
    const hist = this.history();
    if (hist) return `${hist.client.prenom} ${hist.client.nom}`;
    return '';
  }

  shortDateFromHistory(hist: ClientHistorique): string {
    const lastReservation = hist.reservations?.[0];
    return lastReservation ? shortDate(lastReservation.date_fin ?? lastReservation.date_debut) : '—';
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');
    const id = this.auth.getClientId();
    if (id) {
      this.loadHistory(id);
      return;
    }

    this.clients.getMe().subscribe({
      next: client => {
        this.client.set(client);
        if (client.id) {
          this.loadHistory(client.id);
        } else {
          this.loading.set(false);
        }
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(extractApiError(err));
      },
    });
  }

  private loadHistory(id: number): void {
    this.clients
      .getHistorique(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: history => this.history.set(history),
        error: (err: unknown) => this.error.set(extractApiError(err)),
      });
  }
}
