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
    <div class="min-h-screen flex flex-col bg-gray-50 dark:bg-carloc-950 transition-colors duration-300">
      
      <!-- Navbar -->
      <nav class="sticky top-0 z-50 bg-white/95 dark:bg-carloc-950/95 backdrop-blur border-b border-gray-200 dark:border-carloc-800 transition-colors duration-300">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            
            <!-- Logo -->
            <a routerLink="/client" class="inline-flex items-center gap-3 bg-[#080808] px-3 py-2 text-white hover:scale-[1.02] transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-9 w-9 text-[#d7b82a] drop-shadow-[0_0_8px_rgba(215,184,42,0.3)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
                <circle cx="7" cy="17" r="2"/>
                <path d="M9 17h6"/>
                <circle cx="17" cy="17" r="2"/>
              </svg>
              <span class="text-3xl font-black tracking-normal leading-none">CarLoc<span class="text-[#d7b82a]">.</span></span>
            </a>

            <!-- Desktop Navigation -->
            <div class="hidden md:flex items-center gap-7">
              @for (item of navItems; track item.route) {
                <a 
                  [routerLink]="item.route"
                  routerLinkActive="text-gray-950 dark:text-white after:scale-x-100"
                  [routerLinkActiveOptions]="{exact: item.exact || false}"
                  class="relative flex items-center gap-2 py-5 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white transition-colors after:absolute after:left-0 after:right-0 after:bottom-0 after:h-0.5 after:origin-left after:scale-x-0 after:bg-carloc-900 dark:after:bg-white after:transition-transform after:duration-200 hover:after:scale-x-100"
                >
                  <i [class]="'bi ' + item.icon" aria-hidden="true"></i>
                  <span>{{ item.label }}</span>
                </a>
              }
            </div>

            <!-- Right Section -->
            <div class="hidden md:flex items-center gap-3">
              
              <!-- User Menu -->
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-3 px-2 py-1.5">
                  <!-- Avatar -->
                  <div class="relative">
                    <div class="w-10 h-10 rounded-full ring-2 ring-gray-200 dark:ring-carloc-700 overflow-hidden bg-gray-100 dark:bg-carloc-800">
                      @if (userPhoto()) {
                        <img [src]="userPhoto()" [alt]="userLabel()" class="w-full h-full object-cover" />
                      } @else {
                        <div class="w-full h-full flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold text-sm">
                          {{ userShortLabel().slice(0,2).toUpperCase() }}
                        </div>
                      }
                    </div>
                    <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-carloc-900 rounded-full"></div>
                  </div>

                  <!-- User Info -->
                  <div class="hidden lg:flex flex-col">
                    <span class="text-sm font-semibold text-gray-900 dark:text-white">{{ userLabel() }}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">{{ userEmail() }}</span>
                  </div>
                </div>

                <button
                  (click)="logout()"
                  class="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-gray-200 dark:border-carloc-700 bg-white dark:bg-carloc-900 text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-300 hover:border-red-200 dark:hover:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  aria-label="Déconnexion"
                >
                  <i class="bi bi-power" aria-hidden="true"></i>
                  <span>Déconnexion</span>
                </button>
              </div>
            </div>

            <!-- Mobile Menu Button -->
            <button
              (click)="toggleMenu()"
              class="md:hidden p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-carloc-800 rounded-lg"
              aria-label="Menu"
            >
              <i [class]="'bi text-xl ' + (menuOpen() ? 'bi-x-lg' : 'bi-list')" aria-hidden="true"></i>
            </button>
          </div>

          <!-- Mobile Menu -->
          @if (menuOpen()) {
            <div class="md:hidden py-4 border-t border-gray-200 dark:border-carloc-800 animate-slide-up bg-white dark:bg-carloc-950">
              <div class="flex flex-col gap-2">
                @for (item of navItems; track item.route) {
                  <a 
                    [routerLink]="item.route"
                    routerLinkActive="bg-gray-50 dark:bg-carloc-900 text-gray-900 dark:text-white border-l-4 border-carloc-900 dark:border-white"
                    [routerLinkActiveOptions]="{exact: item.exact || false}"
                    (click)="closeMenu()"
                    class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-carloc-900 transition-all"
                  >
                    <i [class]="'bi ' + item.icon" aria-hidden="true"></i>
                    <span>{{ item.label }}</span>
                  </a>
                }
                
                <div class="h-px bg-gray-200 dark:bg-carloc-800 my-2"></div>
                
                <button
                  (click)="logout()"
                  class="flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 dark:border-carloc-700 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all font-semibold"
                >
                  <i class="bi bi-power" aria-hidden="true"></i>
                  <span>Déconnexion</span>
                </button>
              </div>
            </div>
          }
        </div>
      </nav>

      <!-- Main Content -->
      <main class="flex-1 w-full mx-auto py-8 transition-colors duration-300">
        <router-outlet></router-outlet>
      </main>

      <!-- Footer -->
      <footer class="bg-white dark:bg-carloc-900 border-t border-gray-200 dark:border-carloc-800 mt-auto transition-colors duration-300">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div class="inline-flex items-center gap-2 bg-[#080808] px-3 py-2 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-[#d7b82a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
                <circle cx="7" cy="17" r="2"/>
                <path d="M9 17h6"/>
                <circle cx="17" cy="17" r="2"/>
              </svg>
              <span class="text-2xl font-black leading-none">CarLoc<span class="text-[#d7b82a]">.</span></span>
            </div>
            <div class="text-sm font-medium text-gray-500 dark:text-gray-400">
              © 2026 CarLoc. Tous droits réservés.
            </div>
          </div>
        </div>
      </footer>
    </div>
  `,
})
export class ClientShellComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly menuOpen = signal(false);
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
