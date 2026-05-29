import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '@app/auth/auth.service';
import { imageUrl } from '@app/shared/formatters';

interface ShellNavItem {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
}

@Component({
  selector: 'app-client-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
 template: `
<div [ngClass]="isDarkTheme() ? 'theme-dark' : 'theme-light'" class="client-layout">

  <nav class="lux-navbar">
    <a routerLink="/" class="nav-logo">CarLoc<span>.</span></a>

    <button class="hamburger" (click)="toggleMenu()" aria-label="Menu">
      <span></span><span></span><span></span>
    </button>

    <div class="nav-links" [class.open]="menuOpen()">
      @for (item of navItems; track item.route) {
        <a [routerLink]="item.route"
           routerLinkActive="active"
           [routerLinkActiveOptions]="{exact: item.exact || false}"
           (click)="closeMenu()">
          <i class="bi" [ngClass]="item.icon"></i> {{ item.label }}
        </a>
      }
    </div>

    <div class="nav-right" [class.open]="menuOpen()">
      <button class="theme-toggle-btn" (click)="toggleTheme()" aria-label="Basculer le thème">
        <i class="bi" [ngClass]="isDarkTheme() ? 'bi-sun' : 'bi-moon'"></i>
      </button>

      <a routerLink="/catalogue" class="nav-new-resa" (click)="closeMenu()">
        <i class="bi bi-plus-lg"></i> Nouvelle réservation
      </a>

      <div class="nav-sep"></div>

      <div class="nav-profile">
        <div class="avatar-ring">
          @if (userPhoto()) {
            <img [src]="userPhoto()" alt="Profile" (error)="onUserPhotoError()" />
          } @else {
            <div class="avatar-initials">{{ userShortLabel().slice(0,2).toUpperCase() }}</div>
          }
        </div>
        <div class="profile-info">
          <span class="profile-name">{{ userLabel() }}</span>
          <span class="profile-role">{{ userEmail() }}</span>
        </div>
      </div>

      <button class="btn-logout" (click)="logout()">
        <i class="bi bi-box-arrow-right"></i> Déconnexion
      </button>
    </div>
  </nav>

  <div class="client-page-content">
    <router-outlet></router-outlet>
  </div>

</div>
`,
styles: [`
  .client-layout {
    display: flex; flex-direction: column; min-height: 100vh;
    background: var(--lux-bg);
    width: 100%;
    max-width: 100vw;
    overflow-x: hidden;
    box-sizing: border-box;
  }

  .client-layout *,
  .client-layout *::before,
  .client-layout *::after {
    box-sizing: border-box;
  }

  /* ── NAVBAR ── */
  .lux-navbar {
    position: sticky; top: 0; z-index: 200;
    height: 68px;
    width: 100%;
    max-width: 100vw;
    background: var(--lux-surface);
    border-bottom: 1px solid var(--lux-border);
    display: flex; align-items: center;
    padding: 0 2.5rem; gap: 2rem;
    transition: background-color 0.3s ease;
  }

  .nav-logo {
    font-size: 1.6rem; font-weight: 800;
    color: var(--lux-heading);
    letter-spacing: -0.05em;
    text-decoration: none;
    margin-right: 1rem; white-space: nowrap;
  }
  .nav-logo span { color: var(--lux-accent); }

  .nav-links {
    display: flex; align-items: center; gap: 0.25rem; flex: 1;
  }
  .nav-links a {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.5rem 0.9rem; border-radius: 7px;
    color: var(--lux-text-muted);
    font-size: 0.88rem; font-weight: 500;
    text-decoration: none;
    transition: var(--lux-transition);
    white-space: nowrap;
  }
  .nav-links a i { font-size: 1rem; }
  .nav-links a:hover, .nav-links a.active {
    background: rgba(212,175,55,0.1); color: var(--lux-accent);
  }
  .nav-links a.active {
    border-bottom: 2px solid var(--lux-accent);
    border-radius: 7px 7px 0 0;
  }

  /* ── RIGHT ZONE ── */
  .nav-right {
    display: flex; align-items: center; gap: 1rem; margin-left: auto;
  }

  .theme-toggle-btn {
    display: flex; align-items: center; justify-content: center;
    width: 36px; height: 36px; border-radius: 50%;
    background: transparent; border: 1px solid var(--lux-border);
    color: var(--lux-text-muted); cursor: pointer;
    transition: var(--lux-transition); font-size: 1.1rem;
  }
  .theme-toggle-btn:hover {
    background: rgba(212,175,55,0.1); color: var(--lux-accent);
    border-color: var(--lux-accent);
  }

  .nav-new-resa {
    padding: 0.45rem 1.1rem;
    background: var(--lux-accent); color: #0d0d0d;
    border-radius: 7px; font-size: 0.82rem; font-weight: 600;
    text-decoration: none; transition: var(--lux-transition); white-space: nowrap;
  }
  .nav-new-resa:hover { filter: brightness(1.15); }

  /* ── AVATAR ── */
  .nav-profile {
    display: flex; align-items: center; gap: 0.75rem;
    cursor: pointer; padding: 0.35rem 0.6rem; border-radius: 10px;
    transition: var(--lux-transition);
  }
  .nav-profile:hover { background: rgba(212,175,55,0.07); }

  .avatar-ring {
    width: 40px; height: 40px; border-radius: 50%;
    border: 2px solid var(--lux-accent);
    padding: 2px; overflow: hidden;
    display: flex; align-items: center; justify-content: center;
  }
  .avatar-ring img {
    width: 100%; height: 100%; border-radius: 50%; object-fit: cover;
  }
  .avatar-initials {
    width: 100%; height: 100%; border-radius: 50%;
    background: rgba(212,175,55,0.15); color: var(--lux-accent);
    font-size: 0.85rem; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }

  .profile-info { display: flex; flex-direction: column; line-height: 1.3; }
  .profile-name { font-size: 0.85rem; font-weight: 600; color: var(--lux-heading); }
  .profile-role { font-size: 0.72rem; color: var(--lux-text-muted); }

  .nav-sep { width: 1px; height: 28px; background: var(--lux-border); }

  /* ── LOGOUT ── */
  .btn-logout {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.45rem 1rem; background: transparent;
    border: 1px solid var(--lux-border); border-radius: 7px;
    color: var(--lux-text-muted); font-size: 0.82rem; font-weight: 500;
    cursor: pointer; transition: var(--lux-transition); white-space: nowrap;
  }
  .btn-logout:hover {
    border-color: rgba(192,57,43,0.4); color: #e74c3c;
    background: rgba(231,76,60,0.07);
  }

  /* ── HAMBURGER ── */
  .hamburger {
    display: none;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    width: 36px; height: 36px;
    background: transparent;
    border: 1px solid var(--lux-border);
    border-radius: 8px;
    cursor: pointer;
    padding: 8px;
    margin-left: auto;
  }
  .hamburger span {
    display: block;
    width: 100%; height: 2px;
    background: var(--lux-text-muted);
    border-radius: 2px;
    transition: 0.3s;
  }

  /* ── PAGE ── */
  .client-page-content { padding: 3rem; flex: 1; }

  /* ── RESPONSIVE ── */
  @media (max-width: 900px) {
    .lux-navbar {
      flex-wrap: wrap;
      height: auto;
      padding: 1rem 1.5rem;
      gap: 0.75rem;
    }
    .hamburger { display: flex; }
    .nav-links, .nav-right {
      display: none;
      width: 100%;
      flex-direction: column;
      align-items: stretch;
      gap: 0.5rem;
    }
    .nav-links.open, .nav-right.open { display: flex; }
    .nav-links a { padding: 0.75rem 1rem; border-radius: 8px; }
    .nav-links a.active { border-bottom: none; border-left: 3px solid var(--lux-accent); border-radius: 0 8px 8px 0; }
    .nav-right { margin-left: 0; gap: 0.75rem; }
    .nav-sep { display: none; }
    .nav-new-resa { text-align: center; padding: 0.7rem 1rem; }
    .nav-profile { padding: 0.5rem 0; }
    .client-page-content {
      width: 100%;
      max-width: 100vw;
      padding: 1rem;
      overflow-x: hidden;
    }
  }

  @media (max-width: 420px) {
    .lux-navbar {
      padding: 0.85rem;
    }

    .nav-logo {
      font-size: 1.4rem;
    }

    .client-page-content {
      padding: 0.5rem;
    }
  }
`]
})
export class ClientShellComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly menuOpen = signal(false);
  readonly isDarkTheme = signal(true);
  readonly userLabel = signal('Client');
  readonly userShortLabel = signal('Client');
  readonly userEmail = signal('');
  readonly userPhoto = signal<string | null>(null);

  readonly navItems: ShellNavItem[] = [
    { label: 'Accueil', icon: 'bi-house', route: '/client', exact: true },
    { label: 'Mes réservations', icon: 'bi-calendar2-week', route: '/client/reservations' },
    { label: 'Mes factures', icon: 'bi-receipt', route: '/client/factures' },
    { label: 'Mon profil', icon: 'bi-person', route: '/client/profil' },
  ];

  constructor() {
    this.syncUserFromAuth();
    if (typeof window !== 'undefined') {
      window.addEventListener('user-info-updated', () => this.syncUserFromAuth());
      
      const savedTheme = localStorage.getItem('carloc-theme');
      if (savedTheme) {
        this.isDarkTheme.set(savedTheme === 'dark');
      } else {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.isDarkTheme.set(prefersDark);
      }
    }
  }

  toggleTheme(): void {
    const newThemeIsDark = !this.isDarkTheme();
    this.isDarkTheme.set(newThemeIsDark);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('carloc-theme', newThemeIsDark ? 'dark' : 'light');
    }
  }

  toggleMenu(): void {
    this.menuOpen.update(open => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/');
  }

  onUserPhotoError(): void {
    this.userPhoto.set(null);
  }

  private syncUserFromAuth(): void {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem('user_info');
    if (!raw) return;

    try {
      const user = JSON.parse(raw) as Record<string, unknown>;
      const displayName = this.resolveDisplayName(user);
      this.userLabel.set(displayName);
      this.userShortLabel.set(this.resolveShortName(displayName));
      this.userEmail.set(this.resolveEmail(user));
      
      const photo = user['photo_profil_url'] ?? user['photo_profil'];
      if (typeof photo === 'string' && photo) {
        this.userPhoto.set(imageUrl(photo, 'client', 0));
      } else {
        this.userPhoto.set(null);
      }
    } catch {
      // ignore invalid storage
    }
  }

  private resolveDisplayName(user: Record<string, unknown>): string {
    const values = [
      user['fullName'],
      user['nomComplet'],
      user['name'],
      user['nom'],
      [user['prenom'], user['nom']].filter(Boolean).join(' '),
      [user['firstName'], user['lastName']].filter(Boolean).join(' '),
      user['email'],
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

    return values[0] ?? 'Client';
  }

  private resolveShortName(displayName: string): string {
    return displayName.split(' ').slice(0, 2).join(' ');
  }

  private resolveEmail(user: Record<string, unknown>): string {
    const value = user['email'] ?? user['courriel'] ?? user['username'];
    return typeof value === 'string' ? value : '';
  }
}
