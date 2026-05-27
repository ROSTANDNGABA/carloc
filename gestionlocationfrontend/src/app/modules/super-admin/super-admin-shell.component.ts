import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '@app/auth/auth.service';

@Component({
  selector: 'app-super-admin-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="super-admin-layout">
      <aside class="super-sidebar">
        <a class="super-brand" routerLink="/admin">
          <span>CL</span>
          <div>
            <strong>CarLoc</strong>
            <small>Admin système</small>
          </div>
        </a>

        <nav class="super-nav" aria-label="Navigation admin système">
          <a routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            <i class="bi bi-bar-chart-line" aria-hidden="true"></i>
            Vue société
          </a>
          <a routerLink="/admin/gestionnaires" routerLinkActive="active">
            <i class="bi bi-person-gear" aria-hidden="true"></i>
            Gestionnaires
          </a>
          <a routerLink="/admin/historique" routerLinkActive="active">
            <i class="bi bi-clock-history" aria-hidden="true"></i>
            Historique locations
          </a>
        </nav>

        <div class="super-sidebar-footer">
          <span class="status-pill tone-success">
            <i class="bi bi-shield-check" aria-hidden="true"></i>
            Super admin
          </span>
          <button class="super-logout" type="button" (click)="logout()">
            <i class="bi bi-box-arrow-left" aria-hidden="true"></i>
            Déconnexion
          </button>
        </div>
      </aside>

      <section class="super-workspace">
        <header class="super-topbar">
          <div>
            <p>Administration CarLoc</p>
            <h1>Direction et supervision</h1>
          </div>
          <a class="super-site-link" routerLink="/gestionnaire">
            <i class="bi bi-kanban" aria-hidden="true"></i>
            Interface gestionnaire
          </a>
        </header>

        <main>
          <router-outlet />
        </main>
      </section>
    </div>
  `,
  styles: [`
    .super-admin-layout {
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
    .super-sidebar {
      position: sticky;
      top: 0;
      height: 100vh;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      background: #07111f;
      color: #f8fafc;
    }
    .super-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.06);
    }
    .super-brand:hover {
      color: #fff;
    }
    .super-brand span {
      width: 2.25rem;
      height: 2.25rem;
      display: grid;
      place-items: center;
      border-radius: 8px;
      background: #f8c537;
      color: #07111f;
      font-weight: 900;
    }
    .super-brand strong,
    .super-brand small {
      display: block;
    }
    .super-brand small {
      color: #cbd5e1;
      margin-top: 0.15rem;
    }
    .super-nav {
      display: grid;
      gap: 0.4rem;
    }
    .super-nav a {
      min-height: 2.85rem;
      display: flex;
      align-items: center;
      gap: 0.7rem;
      padding: 0.65rem 0.75rem;
      border-radius: 8px;
      color: #cbd5e1;
      font-weight: 800;
      border: 1px solid transparent;
    }
    .super-nav a:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.08);
    }
    .super-nav a.active {
      color: #07111f;
      background: #f8c537;
      border-color: rgba(248, 197, 55, 0.5);
    }
    .super-sidebar-footer {
      margin-top: auto;
      display: grid;
      gap: 0.75rem;
    }
    .super-logout,
    .super-site-link {
      min-height: 2.6rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.55rem;
      border-radius: 8px;
      font-weight: 900;
      border: 1px solid transparent;
    }
    .super-logout {
      color: #fff;
      background: transparent;
      border-color: rgba(255, 255, 255, 0.18);
    }
    .super-logout:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    .super-workspace {
      min-width: 0;
      padding: 1rem;
    }
    .super-topbar {
      min-height: 5.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.25rem;
      margin-bottom: 1rem;
      border: 1px solid #dbe4ef;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
    }
    .super-topbar p,
    .super-topbar h1 {
      margin: 0;
    }
    .super-topbar p {
      color: #1646a3;
      font-size: 0.78rem;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .super-topbar h1 {
      margin-top: 0.2rem;
      color: #0f172a;
      font-size: clamp(1.45rem, 2vw, 2rem);
      font-weight: 950;
    }
    .super-site-link {
      padding-inline: 1rem;
      color: #1646a3;
      background: #eef4ff;
      border-color: #c9d9f5;
    }
    @media (max-width: 860px) {
      .super-admin-layout {
        grid-template-columns: 1fr;
      }
      .super-sidebar {
        position: relative;
        height: auto;
      }
      .super-topbar {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `],
})
export class SuperAdminShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
