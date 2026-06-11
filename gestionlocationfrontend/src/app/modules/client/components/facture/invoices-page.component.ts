import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { finalize, switchMap } from 'rxjs';
import { FactureService } from '@app/core/services/facture.service';
import { extractApiError } from '@app/core/utils/api.util';
import { Facture } from '@app/models/facture.model';
import { money, shortDate } from '@app/shared/formatters';

@Component({
  selector: 'app-invoices-page',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
  <div>
    <h2 class="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Mes factures</h2>
    <p class="text-gray-500 dark:text-gray-400 mt-1">Consultez vos factures, ouvrez le PDF en aperçu et suivez vos dépenses.</p>
  </div>

  @if (error()) {
    <div class="rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-red-700 dark:text-red-300 font-medium">
      {{ error() }}
    </div>
  }
  @if (message()) {
    <div class="rounded-lg border border-green-200 dark:border-green-900/40 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-green-700 dark:text-green-300 font-medium">
      {{ message() }}
    </div>
  }

  @if (loading()) {
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      @for (i of [1, 2, 3]; track i) {
        <div class="h-28 rounded-lg bg-gray-100 dark:bg-carloc-900 animate-pulse"></div>
      }
    </div>
  } @else {
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      <section class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="rounded-lg bg-white dark:bg-carloc-900 border border-gray-200 dark:border-carloc-800 p-5">
            <span class="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Total payé</span>
            <strong class="block mt-2 text-2xl font-black text-gray-900 dark:text-white">{{ totalAmountLabel() }}</strong>
          </div>
          <div class="rounded-lg bg-white dark:bg-carloc-900 border border-gray-200 dark:border-carloc-800 p-5">
            <span class="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Factures payées</span>
            <strong class="block mt-2 text-2xl font-black text-gray-900 dark:text-white">{{ paidCount() }}</strong>
          </div>
          <div class="rounded-lg bg-white dark:bg-carloc-900 border border-gray-200 dark:border-carloc-800 p-5">
            <span class="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">En attente</span>
            <strong class="block mt-2 text-2xl font-black text-gray-900 dark:text-white">{{ pendingCount() }}</strong>
          </div>
        </div>

        @if (factures().length) {
          <div class="rounded-lg bg-white dark:bg-carloc-900 border border-gray-200 dark:border-carloc-800 overflow-hidden">
            <div class="divide-y divide-gray-100 dark:divide-carloc-800">
              @for (fac of factures(); track fac.id) {
                <article class="p-5 flex flex-col md:flex-row md:items-center gap-4 hover:bg-gray-50 dark:hover:bg-carloc-800/30 transition-colors">
                  <div class="flex-1 min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <h3 class="font-black text-gray-900 dark:text-white">{{ fac.numero || ('FAC-' + fac.id) }}</h3>
                      <span class="px-2.5 py-1 rounded-full text-xs font-black uppercase border" [ngClass]="statusClass(fac)">
                        {{ fac.statut }}
                      </span>
                    </div>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{{ fac.vehicule_info || ('Réservation #' + fac.reservation) }}</p>
                    <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mt-2">
                      <span>{{ dateFmt(fac.date_emission) }}</span>
                      <span>{{ fac.categorie_vehicule || 'Catégorie non renseignée' }}</span>
                      <span>RES-{{ fac.reservation }}</span>
                    </div>
                  </div>

                  <div class="flex items-center justify-between md:justify-end gap-4">
                    <strong class="text-lg font-black text-gray-900 dark:text-white">{{ moneyFmt(fac.montant_total) }}</strong>
                    <button type="button" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-carloc-900 dark:bg-white text-white dark:text-carloc-950 font-bold hover:bg-black dark:hover:bg-gray-200 transition-colors disabled:opacity-50" (click)="preview(fac)" [disabled]="working() === fac.id">
                      @if (working() === fac.id) {
                        <i class="bi bi-arrow-repeat animate-spin"></i>
                      } @else {
                        <i class="bi bi-eye"></i>
                      }
                      Voir
                    </button>
                  </div>
                </article>
              }
            </div>
          </div>

          <div class="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200 dark:border-carloc-800 pt-5">
            <span class="text-sm font-semibold text-gray-500 dark:text-gray-400">
              Page {{ page() }} sur {{ totalPages() }} · {{ count() }} facture(s)
            </span>
            <div class="flex items-center gap-2">
              <button class="px-4 py-2 rounded-lg border border-gray-200 dark:border-carloc-700 font-bold text-gray-700 dark:text-gray-200 disabled:opacity-40" type="button" [disabled]="page() <= 1 || loading()" (click)="goToPage(page() - 1)">
                Précédent
              </button>
              <button class="px-4 py-2 rounded-lg border border-gray-200 dark:border-carloc-700 font-bold text-gray-700 dark:text-gray-200 disabled:opacity-40" type="button" [disabled]="page() >= totalPages() || loading()" (click)="goToPage(page() + 1)">
                Suivant
              </button>
            </div>
          </div>
        } @else {
          <div class="rounded-lg border border-dashed border-gray-300 dark:border-carloc-700 bg-white dark:bg-carloc-900 p-10 text-center">
            <i class="bi bi-receipt text-4xl text-gray-400"></i>
            <h3 class="text-xl font-black text-gray-900 dark:text-white mt-4">Aucune facture</h3>
            <p class="text-gray-500 dark:text-gray-400 mt-2">Vos factures apparaîtront ici après vos réservations.</p>
          </div>
        }
      </section>

      <aside class="rounded-lg bg-white dark:bg-carloc-900 border border-gray-200 dark:border-carloc-800 p-5 h-fit">
        <h3 class="font-black text-gray-900 dark:text-white">Dépenses par catégorie</h3>
        <div class="space-y-4 mt-5">
          @for (row of expensesByCategory(); track row.category) {
            <div>
              <div class="flex items-center justify-between gap-3 text-sm">
                <span class="font-bold text-gray-700 dark:text-gray-200 truncate">{{ row.category }}</span>
                <strong class="text-gray-900 dark:text-white">{{ moneyFmt(row.total) }}</strong>
              </div>
              <div class="mt-2 h-2 rounded-full bg-gray-100 dark:bg-carloc-800 overflow-hidden">
                <div class="h-full bg-carloc-900 dark:bg-white" [style.width.%]="row.percent"></div>
              </div>
            </div>
          } @empty {
            <p class="text-sm text-gray-500 dark:text-gray-400">Aucune dépense à catégoriser.</p>
          }
        </div>
      </aside>
    </div>
  }

  @if (previewResourceUrl()) {
    <div class="fixed inset-0 z-50 bg-carloc-950/80 backdrop-blur-sm p-4 flex items-center justify-center" (click)="closePreview()">
      <div class="w-full max-w-5xl h-[88vh] rounded-lg overflow-hidden bg-white dark:bg-carloc-950 border border-gray-200 dark:border-carloc-800 shadow-2xl flex flex-col" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-carloc-800">
          <strong class="text-gray-900 dark:text-white truncate">{{ previewTitle() }}</strong>
          <button type="button" class="w-9 h-9 rounded-lg hover:bg-gray-100 dark:hover:bg-carloc-800 text-gray-600 dark:text-gray-300" (click)="closePreview()">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        @if (previewUrl(); as url) {
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-carloc-800 bg-gray-50 dark:bg-carloc-900">
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Sur telephone, ouvrez la facture dans un nouvel onglet ou telechargez le PDF.
            </p>
            <div class="grid grid-cols-1 sm:flex gap-2">
              <a [href]="url" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-carloc-900 dark:bg-white text-white dark:text-carloc-950 font-bold hover:bg-black dark:hover:bg-gray-200 transition-colors">
                <i class="bi bi-box-arrow-up-right"></i>
                Ouvrir
              </a>
              <a [href]="url" [download]="previewFilename()" class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-carloc-700 text-gray-800 dark:text-gray-100 font-bold hover:bg-white dark:hover:bg-carloc-800 transition-colors">
                <i class="bi bi-download"></i>
                Telecharger
              </a>
            </div>
          </div>
          @if (isMobilePreview()) {
            <div class="flex-1 bg-white dark:bg-carloc-950 flex items-center justify-center px-6 py-10">
              <div class="max-w-sm text-center">
                <div class="mx-auto w-16 h-16 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 flex items-center justify-center text-3xl">
                  <i class="bi bi-file-earmark-pdf"></i>
                </div>
                <h3 class="mt-5 text-xl font-black text-gray-900 dark:text-white">Facture prete</h3>
                <p class="mt-2 text-gray-500 dark:text-gray-400">
                  Les navigateurs mobiles bloquent parfois l'apercu PDF integre. Utilisez le bouton ouvrir pour afficher la facture.
                </p>
                <div class="mt-6 grid gap-3">
                  <a [href]="url" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-carloc-900 dark:bg-white text-white dark:text-carloc-950 font-black">
                    <i class="bi bi-box-arrow-up-right"></i>
                    Ouvrir la facture
                  </a>
                  <a [href]="url" [download]="previewFilename()" class="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-gray-200 dark:border-carloc-700 text-gray-800 dark:text-gray-100 font-black">
                    <i class="bi bi-download"></i>
                    Telecharger
                  </a>
                </div>
              </div>
            </div>
          } @else {
            <iframe [src]="previewResourceUrl()" class="flex-1 w-full bg-white" title="Apercu facture"></iframe>
          }
        }
      </div>
    </div>
  }
</div>
  `,
})
export class InvoicesPageComponent {
  private readonly facturesService = inject(FactureService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly factures = signal<Facture[]>([]);
  readonly loading = signal(true);
  readonly working = signal<number | null>(null);
  readonly error = signal('');
  readonly message = signal('');
  readonly page = signal(1);
  readonly count = signal(0);
  readonly previewUrl = signal<string | null>(null);
  readonly previewResourceUrl = signal<SafeResourceUrl | null>(null);
  readonly previewTitle = signal('Facture');
  readonly previewFilename = signal('facture.pdf');
  readonly isMobilePreview = signal(false);

  readonly paidCount = computed(() => this.factures().filter(f => f.statut === 'payee').length);
  readonly pendingCount = computed(() => this.factures().filter(f => f.statut !== 'payee' && f.statut !== 'annulee').length);
  readonly totalAmountLabel = computed(() => this.moneyFmt(this.factures().reduce((sum, f) => sum + Number(f.reservation_total_paye || f.montant_total || 0), 0)));
  readonly expensesByCategory = computed(() => {
    const totals = new Map<string, number>();
    for (const facture of this.factures()) {
      const category = facture.categorie_vehicule || 'Autres';
      totals.set(category, (totals.get(category) ?? 0) + Number(facture.montant_total || 0));
    }
    const max = Math.max(...totals.values(), 1);
    return [...totals.entries()]
      .map(([category, total]) => ({ category, total, percent: Math.max(6, Math.round((total / max) * 100)) }))
      .sort((a, b) => b.total - a.total);
  });

  readonly moneyFmt = money;
  readonly dateFmt = shortDate;

  constructor() {
    this.load();
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.count() / 10));
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.page.set(page);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.facturesService
      .getFacturesPage(this.page())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: response => {
          this.factures.set(response.results ?? []);
          this.count.set(response.count ?? 0);
        },
        error: (err: unknown) => this.error.set(extractApiError(err)),
      });
  }

  preview(facture: Facture): void {
    this.working.set(facture.id);
    this.error.set('');
    this.message.set('');
    this.previewTitle.set(facture.numero || `Facture #${facture.id}`);
    this.previewFilename.set(this.pdfFilename(facture));
    this.isMobilePreview.set(this.detectMobilePreview());

    const source = facture.fichier_pdf_url
      ? this.facturesService.downloadPdf(facture.id)
      : this.facturesService.genererPdf(facture.id).pipe(switchMap(updated => this.facturesService.downloadPdf(updated.id)));

    source.pipe(finalize(() => this.working.set(null))).subscribe({
      next: blob => {
        if (typeof window === 'undefined') return;
        this.revokePreviewUrl();
        const pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(pdfBlob);
        this.previewUrl.set(url);
        this.previewResourceUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
      },
      error: (err: unknown) => this.error.set(extractApiError(err)),
    });
  }

  closePreview(): void {
    this.revokePreviewUrl();
    this.previewUrl.set(null);
    this.previewResourceUrl.set(null);
    this.previewFilename.set('facture.pdf');
    this.isMobilePreview.set(false);
  }

  statusClass(facture: Facture): string {
    if (facture.statut === 'payee') return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900/40';
    if (facture.statut === 'annulee') return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900/40';
    if (facture.statut === 'brouillon') return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-900/40';
    return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900/40';
  }

  private revokePreviewUrl(): void {
    const current = this.previewUrl();
    if (current && typeof window !== 'undefined') {
      window.URL.revokeObjectURL(current);
    }
  }

  private detectMobilePreview(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches || /Android|iPhone|iPad|iPod|IEMobile|Opera Mini|Mobile/i.test(window.navigator.userAgent);
  }

  private pdfFilename(facture: Facture): string {
    const base = facture.numero || `facture-${facture.id}`;
    return `${base.replace(/[^a-z0-9._-]+/gi, '-')}.pdf`;
  }
}
