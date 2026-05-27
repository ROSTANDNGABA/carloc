import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '@app/auth/auth.service';

@Component({
  selector: 'app-public-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div [ngClass]="isDarkTheme() ? 'theme-dark' : 'theme-light'">
  <header class="lux-header">
    <div class="lux-container">
      <a routerLink="/" class="lux-logo">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--lux-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="logo-icon"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
        CarLoc<span>.</span>
      </a>
      <nav class="lux-nav">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">Accueil</a>
        <a style="cursor: pointer" (click)="scrollToServices()">Nos Services</a>
        <a routerLink="/catalogue" routerLinkActive="active">Notre Flotte</a>
      </nav>
      <div class="lux-actions">
        <button class="theme-toggle-btn" type="button" (click)="toggleTheme()" aria-label="Basculer le thème">
          <i class="bi" [ngClass]="isDarkTheme() ? 'bi-sun' : 'bi-moon'"></i>
        </button>
        
        @if (isLoggedIn()) {
          <a routerLink="/client" class="lux-btn lux-btn-primary btn-with-icon">
            Espace Client
          </a>
        } @else {
          <a routerLink="/login" class="lux-btn lux-btn-primary btn-with-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
            Connexion
          </a>
        }
      </div>
    </div>
  </header>

  <main class="lux-main">
    <router-outlet></router-outlet>
  </main>

  <footer class="lux-footer">
    <div class="lux-container footer-grid">
      <div class="footer-brand">
        <h3>CarLoc<span>.</span></h3>
        <p>L'excellence de la location automobile. Conduisez vos rêves dès aujourd'hui.</p>
      </div>
      <div class="footer-links">
        <h4>Navigation</h4>
        <a routerLink="/">Accueil</a>
        <a routerLink="/catalogue">Flotte</a>
        <a routerLink="/login">Espace Client</a>
      </div>
      <div class="footer-cta">
        <h4>Prêt à partir ?</h4>
        <a routerLink="/register" class="lux-btn lux-btn-primary">Commencer maintenant</a>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2026 CarLoc. Tous droits réservés.</p>
    </div>
  </footer>
</div>
  `,
  styles: [`
  .lux-header {
    background-color: rgba(10, 10, 10, 0.85);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--lux-border);
    position: sticky;
    top: 0;
    z-index: 1000;
    transition: all 0.3s ease;
  }
  .theme-light .lux-header {
    background-color: rgba(255, 255, 255, 0.95);
    border-bottom-color: var(--lux-border);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  }
  .lux-nav a {
    font-weight: 600;
    font-size: 1.05rem;
    color: var(--lux-text);
  }
  .theme-light .lux-nav a {
    color: #1e293b;
  }
  .theme-light .lux-logo {
    color: #0f172a;
  }
  .theme-light .theme-toggle-btn {
    border-color: #cbd5e1;
    color: #475569;
  }
  .theme-light .theme-toggle-btn:hover {
    background: rgba(212,175,55,0.12);
    color: var(--lux-accent);
    border-color: var(--lux-accent);
  }
  .lux-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 80px;
  }
  .lux-logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1.8rem;
    font-weight: 800;
    color: var(--lux-heading);
    letter-spacing: -0.05em;
    text-decoration: none;
    transition: transform 0.3s ease;
  }
  .lux-logo:hover {
    transform: scale(1.02);
  }
  .lux-logo span {
    color: var(--lux-accent);
  }
  .logo-icon {
    filter: drop-shadow(0 0 8px rgba(212, 175, 55, 0.4));
  }
  .lux-nav {
    display: flex;
    gap: 2.5rem;
  }
  .lux-nav a {
    font-weight: 500;
    font-size: 1.05rem;
  }
  .lux-nav a.active {
    color: var(--lux-accent);
  }
  .lux-actions {
    display: flex;
    gap: 1rem;
    align-items: center;
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
  .btn-with-icon {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-left: 1.2rem;
    padding-right: 1.5rem;
  }
  .btn-with-icon svg {
    transition: transform 0.3s ease;
  }
  .btn-with-icon:hover svg {
    transform: translateX(3px);
  }
  .lux-main {
    flex: 1;
  }
  .lux-footer {
    background-color: var(--lux-surface);
    border-top: 1px solid var(--lux-border);
    padding: 4rem 0 2rem;
    margin-top: 4rem;
  }
  .footer-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 4rem;
    align-items: flex-start;
  }
  .footer-brand h3 {
    font-size: 1.8rem;
    font-weight: 800;
    margin-bottom: 1rem;
  }
  .footer-brand span {
    color: var(--lux-accent);
  }
  .footer-brand p {
    color: var(--lux-text-muted);
    line-height: 1.6;
  }
  .footer-links {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .footer-links h4, .footer-cta h4 {
    margin-bottom: 0.5rem;
  }
  .footer-bottom {
    max-width: 1200px;
    margin: 4rem auto 0;
    padding: 2rem 2rem 0;
    border-top: 1px solid var(--lux-border);
    text-align: center;
    color: var(--lux-text-muted);
    font-size: 0.9rem;
  }
  
  @media (max-width: 768px) {
    .lux-container {
      flex-direction: column;
      height: auto;
      padding: 1.5rem;
      gap: 1.5rem;
    }
    .lux-nav {
      gap: 1.5rem;
      flex-wrap: wrap;
      justify-content: center;
    }
    .footer-grid {
      grid-template-columns: 1fr;
      gap: 2rem;
      text-align: center;
    }
  }
  `]
})
export class PublicShellComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  
  readonly currentYear = new Date().getFullYear();
  readonly isDarkTheme = signal(true);
  readonly isScrolled = signal(false);
  menuOpen = signal(false);

  @HostListener('window:scroll')
  onWindowScroll() {
    this.isScrolled.set(window.scrollY > 20);
  }

  ngOnInit() {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('carloc-theme');
      if (savedTheme) {
        this.isDarkTheme.set(savedTheme === 'dark');
      } else {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.isDarkTheme.set(prefersDark);
      }
    }
  }

  isLoggedIn(): boolean {
    return this.auth.isLoggedIn();
  }

  toggleTheme(): void {
    const newThemeIsDark = !this.isDarkTheme();
    this.isDarkTheme.set(newThemeIsDark);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('carloc-theme', newThemeIsDark ? 'dark' : 'light');
    }
  }

  toggleMenu() {
    this.menuOpen.update(open => !open);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  scrollToServices() {
    if (this.router.url === '/' || this.router.url.startsWith('/#')) {
      document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      this.router.navigate(['/']).then(() => {
        setTimeout(() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' }), 100);
      });
    }
  }
}
