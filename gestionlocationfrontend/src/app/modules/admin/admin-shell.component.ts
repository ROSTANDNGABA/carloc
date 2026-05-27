import { Component, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '@app/auth/auth.service';

interface NavItem {
  label: string;
  icon: string;
  link: string;
}

interface PageContext {
  title: string;
  subtitle: string;
  badge: string;
}

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="admin-layout" [class.dark-mode]="isDark()">
      <aside class="sidebar">
        <a class="brand sidebar-brand" [routerLink]="basePath">
          <span class="brand-mark">CL</span>
          <span>
            <strong>CarLoc</strong>
            <small>{{ auth.isAdmin() ? 'Administration' : 'Gestion' }}</small>
          </span>
        </a>

        <p class="side-section-title">Modules</p>
        <nav class="side-nav" aria-label="Navigation administration">
          @for (item of navItems; track item.link) {
            <a
              [routerLink]="item.link"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.link === basePath }"
            >
              <i [class]="'bi ' + item.icon" aria-hidden="true"></i>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>

        <div class="admin-user-strip">
          <span class="user-dot" aria-hidden="true"></span>
          <div>
            <strong>{{ auth.isAdmin() ? 'Admin systeme' : 'Gestionnaire' }}</strong>
            <small>Session active</small>
          </div>
        </div>

        <button class="btn btn-sidebar" type="button" (click)="logout()">
          <i class="bi bi-box-arrow-left" aria-hidden="true"></i>
          Déconnexion
        </button>
      </aside>

      <section class="workspace">
        <header class="workspace-topbar">
          <div class="topbar-copy">
            <div class="topbar-meta">
              <span class="eyebrow">{{ auth.isAdmin() ? 'Administration' : 'Gestion' }}</span>
              <span class="module-badge">{{ pageContext().badge }}</span>
            </div>
            <h1>{{ pageContext().title }}</h1>
            <p class="topbar-subtitle">{{ pageContext().subtitle }}</p>
          </div>

          <div class="topbar-actions">
            <button class="btn btn-icon" type="button" (click)="toggleTheme()" aria-label="Changer le thème">
              <i [class]="isDark() ? 'bi bi-sun' : 'bi bi-moon'" aria-hidden="true"></i>
            </button>
            <span class="status-pill tone-success">
              <i class="bi bi-shield-check" aria-hidden="true"></i>
              Session sécurisée
            </span>
            <a class="btn btn-quiet" routerLink="/catalogue">
              <i class="bi bi-globe2" aria-hidden="true"></i>
              Voir le site
            </a>
          </div>
        </header>

        <main class="workspace-main">
          <router-outlet />
        </main>
      </section>
    </div>
  `,
  styles: [`
    .admin-layout {
      --admin-bg: #f3f6fb;
      --admin-panel: #ffffff;
      --admin-panel-soft: #f8fafc;
      --admin-border: #dbe4ef;
      --admin-border-strong: #b8c4d4;
      --admin-text: #172033;
      --admin-muted: #64748b;
      --admin-heading: #0f172a;
      --admin-primary: #1646a3;
      --admin-primary-soft: rgba(22, 70, 163, 0.09);
      --admin-teal: #0f766e;
      --admin-radius: 8px;
      --admin-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);

      min-height: 100vh;
      display: grid;
      grid-template-columns: 17rem minmax(0, 1fr);
      background: #f3f6fb;
      color: #172033;
    }

    .sidebar {
      position: sticky;
      top: 0;
      height: 100vh;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      overflow: auto;
      border-right: 1.5px solid var(--admin-border);
      background: #ffffff;
      box-shadow: 1px 0 0 rgba(15, 23, 42, 0.02);
    }

    .sidebar-brand {
      min-height: 3.25rem;
      padding: 0.65rem 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.7rem;
      border-radius: var(--admin-radius);
      border: 1.5px solid var(--admin-border);
      background: var(--admin-panel);
      box-shadow: var(--admin-shadow);
    }

    .brand-mark {
      width: 2.1rem;
      height: 2.1rem;
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      border-radius: 8px;
      background: linear-gradient(135deg, var(--admin-primary), #3b82f6);
      color: #ffffff;
      font-weight: 900;
    }

    .sidebar-brand strong,
    .admin-user-strip strong {
      display: block;
      color: var(--admin-heading);
      line-height: 1.1;
    }

    .sidebar-brand small,
    .admin-user-strip small {
      display: block;
      margin-top: 0.15rem;
      color: var(--admin-muted);
      font-size: 0.78rem;
    }

    .side-section-title {
      margin: 0.35rem 0 0;
      padding-inline: 0.25rem;
      color: var(--admin-muted);
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .side-nav {
      display: grid;
      gap: 0.25rem;
    }

    .side-nav a {
      min-height: 2.75rem;
      display: flex;
      align-items: center;
      gap: 0.7rem;
      padding: 0.6rem 0.7rem;
      border-radius: var(--admin-radius);
      border: 1.5px solid transparent;
      color: var(--admin-text);
      font-weight: 800;
      transition: all 160ms ease;
    }

    .side-nav a:hover {
      background: var(--admin-panel-soft);
      border-color: var(--admin-border);
    }

    .side-nav a.active {
      background: linear-gradient(135deg, var(--admin-primary), #1d4ed8);
      color: #ffffff;
      border-color: rgba(22, 70, 163, 0.5);
      box-shadow: var(--admin-shadow);
    }

    .side-nav a.active i {
      color: #ffffff;
    }

    .side-nav i {
      color: var(--admin-muted);
      font-size: 1.15rem;
    }

    .admin-user-strip {
      margin-top: auto;
      padding: 0.85rem 0.75rem;
      border-radius: var(--admin-radius);
      border: 1.5px solid var(--admin-border);
      background: var(--admin-panel-soft);
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .user-dot {
      width: 0.75rem;
      height: 0.75rem;
      border-radius: 999px;
      background: #10b981;
      box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.12);
    }

    .workspace {
      min-width: 0;
      padding: 1.25rem;
      overflow: auto;
    }

    .workspace-topbar {
      min-height: 5.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.25rem;
      margin-bottom: 1.25rem;
      border: 1.5px solid var(--admin-border);
      border-radius: var(--admin-radius);
      background: #ffffff;
      box-shadow: var(--admin-shadow);
    }

    .topbar-copy {
      min-width: 0;
    }

    .topbar-meta {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.25rem;
    }

    .topbar-copy h1 {
      margin: 0;
      color: var(--admin-heading);
      font-size: clamp(1.4rem, 2vw, 1.8rem);
      font-weight: 950;
    }

    .topbar-subtitle {
      margin: 0.3rem 0 0;
      color: var(--admin-muted);
      font-size: 0.95rem;
    }

    .module-badge {
      padding: 0.25rem 0.7rem;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 900;
      background: rgba(22, 70, 163, 0.1);
      color: var(--admin-primary);
    }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .btn {
      min-height: 2.5rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      border-radius: var(--admin-radius);
      font-family: inherit;
      font-weight: 800;
      cursor: pointer;
      border: 1.5px solid transparent;
      background: transparent;
      color: var(--admin-text);
      transition: all 160ms ease;
    }

    .btn-icon {
      width: 2.75rem;
      padding: 0;
      border-color: var(--admin-border);
      background: var(--admin-panel);
      color: var(--admin-text);
    }

    .btn-icon:hover {
      background: var(--admin-panel-soft);
      border-color: var(--admin-primary);
      color: var(--admin-primary);
    }

    .btn-quiet {
      padding-inline: 1rem;
      border-color: var(--admin-border);
      background: var(--admin-panel);
      color: var(--admin-text);
    }

    .btn-quiet:hover {
      background: var(--admin-panel-soft);
      border-color: var(--admin-primary);
      color: var(--admin-primary);
    }

    .btn-sidebar {
      padding-inline: 1rem;
      border-color: var(--admin-border);
      background: var(--admin-panel);
      color: var(--admin-text);
      width: 100%;
    }

    .btn-sidebar:hover {
      background: var(--admin-panel-soft);
      border-color: var(--admin-primary);
      color: var(--admin-primary);
    }

    .status-pill {
      padding: 0.5rem 0.9rem;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.8rem;
      font-weight: 900;
    }

    .status-pill.tone-success {
      background: rgba(16, 185, 129, 0.1);
      color: #059669;
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .workspace-main {
      min-width: 0;
    }

    .admin-layout.dark-mode {
      --admin-bg: #0b1220;
      --admin-panel: #111827;
      --admin-panel-soft: #182235;
      --admin-border: #263449;
      --admin-border-strong: #3a4a63;
      --admin-text: #e5e7eb;
      --admin-muted: #a8b3c3;
      --admin-heading: #f8fafc;
      --admin-primary: #60a5fa;
      --admin-primary-soft: rgba(96, 165, 250, 0.13);
      --admin-teal: #5eead4;
      --admin-shadow: 0 14px 32px rgba(0, 0, 0, 0.24);
      background:
        linear-gradient(180deg, #0f172a 0%, var(--admin-bg) 28rem),
        var(--admin-bg);
    }

    .admin-layout.dark-mode .sidebar,
    .admin-layout.dark-mode .workspace-topbar,
    .admin-layout.dark-mode .surface-panel,
    .admin-layout.dark-mode .metric,
    .admin-layout.dark-mode .table-wrap,
    .admin-layout.dark-mode .sidebar-brand,
    .admin-layout.dark-mode .sidebar-card,
    .admin-layout.dark-mode .vehicle-admin-item,
    .admin-layout.dark-mode .manager-bar {
      background: var(--admin-panel);
    }

    .admin-layout.dark-mode .workspace-topbar {
      background: linear-gradient(135deg, #111827, #172033);
    }

    .admin-layout.dark-mode .side-nav a.active {
      color: #06111f;
      background: linear-gradient(135deg, #93c5fd, #60a5fa);
      border-color: rgba(147, 197, 253, 0.5);
    }

    .admin-layout.dark-mode .side-nav a.active i {
      color: #06111f;
    }

    .admin-layout.dark-mode .btn-quiet,
    .admin-layout.dark-mode .btn-icon,
    .admin-layout.dark-mode input,
    .admin-layout.dark-mode select,
    .admin-layout.dark-mode textarea {
      color: var(--admin-text);
      background: var(--admin-panel-soft);
      border-color: var(--admin-border);
    }

    .admin-layout.dark-mode .data-table thead th {
      background: #182235;
      color: var(--admin-muted);
    }

    .admin-layout.dark-mode .data-table tbody td {
      border-bottom-color: rgba(58, 74, 99, 0.72);
    }

    .admin-layout.dark-mode .data-table tbody tr:hover {
      background: rgba(96, 165, 250, 0.08);
    }

    .admin-layout.dark-mode .metric-primary,
    .admin-layout.dark-mode .metric-accent,
    .admin-layout.dark-mode .metric-warning,
    .admin-layout.dark-mode .metric.warning {
      background: linear-gradient(180deg, #111827 0%, #172033 100%);
    }

    @media (max-width: 991.98px) {
      .admin-layout {
        grid-template-columns: 1fr;
      }

      .sidebar {
        position: fixed;
        left: -100%;
        top: 0;
        z-index: 1000;
        width: 280px;
        transition: left 0.3s ease;
      }

      .sidebar.open {
        left: 0;
      }

      .admin-metrics {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .content-grid.two {
        grid-template-columns: 1fr;
      }

      .workflow-diagram {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (max-width: 767.98px) {
      .section-head,
      .cta-band {
        flex-direction: column;
        align-items: start;
      }

      .metric-grid,
      .vehicle-grid,
      .catalogue-grid,
      .value-grid,
      .service-grid,
      .hero-proof,
      .summary-grid,
      .form-grid {
        grid-template-columns: 1fr;
      }

      .admin-metrics {
        grid-template-columns: 1fr;
      }

      .fleet-split {
        grid-template-columns: 1fr;
      }

      .workflow-diagram {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .btn {
        border-radius: var(--carloc-radius-md);
      }

      .table > :not(caption) > * > * {
        padding: 0.8rem 0.85rem;
      }

      .hero-copy h1,
      .hero-copy .page-title {
        max-width: 100%;
      }

      .client-page-content {
        padding: 1.5rem;
      }
    }

    @media (max-width: 575.98px) {
      .workflow-diagram {
        grid-template-columns: 1fr;
      }

      .summary-list {
        grid-template-columns: 1fr;
      }

      .cta-steps {
        justify-content: center;
      }
    }
  `],
})
export class AdminShellComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly isDark = signal(false);
  readonly basePath = this.auth.isGestionnaire() ? '/gestionnaire' : '/admin';

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'bi-speedometer2', link: this.basePath },
    ...(this.auth.isAdmin()
      ? [{ label: 'Gestionnaires', icon: 'bi-person-gear', link: '/admin/gestionnaires' }]
      : []),
    { label: 'Flotte', icon: 'bi-car-front', link: `${this.basePath}/vehicules` },
    { label: 'Réservations', icon: 'bi-calendar2-check', link: `${this.basePath}/reservations` },
    { label: 'Clients', icon: 'bi-people', link: `${this.basePath}/clients` },
    { label: 'Finance', icon: 'bi-wallet2', link: `${this.basePath}/finance` },
    { label: 'Contrats', icon: 'bi-file-earmark-text', link: `${this.basePath}/contrats` },
    { label: 'Maintenance', icon: 'bi-tools', link: `${this.basePath}/maintenance` },
  ];

  readonly pageContext = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.resolvePageContext()),
      startWith(this.resolvePageContext()),
    ),
    { initialValue: this.resolvePageContext() },
  );

  private resolvePageContext(): PageContext {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }

    const title = typeof route.data['title'] === 'string' ? route.data['title'] : 'Dashboard';

    switch (title) {
      case 'Flotte':
        return {
          title: 'Gestion de la flotte',
          subtitle: 'Véhicules, tarifs journaliers, images et statuts de disponibilité.',
          badge: 'Parc',
        };
      case 'Réservations':
        return {
          title: 'Planning des locations',
          subtitle: 'Création, suivi des périodes et annulations de réservations.',
          badge: 'Planning',
        };
      case 'Clients':
        return {
          title: 'Portefeuille client',
          subtitle: 'Profils clients, documents et historique des interactions.',
          badge: 'CRM',
        };
      case 'Finance':
        return {
          title: 'Pilotage financier',
          subtitle: 'Paiements, factures et solde impayé par réservation.',
          badge: 'Trésorerie',
        };
      case 'Contrats':
        return {
          title: 'Contrats de location',
          subtitle: 'Création, génération PDF et clôture de la location.',
          badge: 'Contrats',
        };
      case 'Maintenance':
        return {
          title: 'Maintenance du parc',
          subtitle: 'Opérations atelier, garages et coûts d’entretien.',
          badge: 'Atelier',
        };
      case 'Gestionnaires':
        return {
          title: 'Gestion des gestionnaires',
          subtitle: 'Comptes internes, chiffre d affaires et historique des locations traitees.',
          badge: 'Equipe',
        };
      default:
        return {
          title: 'Dashboard de pilotage',
          subtitle: 'Synthèse de l’activité, des revenus et de l’occupation du parc.',
          badge: 'KPI',
        };
    }
  }

  ngOnInit(): void {
    const savedTheme = localStorage.getItem('carloc-admin-theme');
    this.isDark.set(savedTheme === 'dark');
  }

  toggleTheme(): void {
    this.isDark.set(!this.isDark());
    localStorage.setItem('carloc-admin-theme', this.isDark() ? 'dark' : 'light');
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
