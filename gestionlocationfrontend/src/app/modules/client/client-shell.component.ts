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
    <div class="min-h-screen flex flex-col bg-gray-50">
      
      <!-- Navbar -->
      <nav class="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            
            <!-- Logo -->
            <a routerLink="/" class="flex items-center gap-2 text-2xl font-black text-gray-900 hover:text-carloc-600 transition-colors">
              <div class="w-10 h-10 bg-gradient-to-br from-carloc-600 to-carloc-500 rounded-xl flex items-center justify-center text-white font-black text-lg">
                C
              </div>
              <span>CarLoc<span class="text-carloc-600">.</span></span>
            </a>

            <!-- Desktop Navigation -->
            <div class="hidden md:flex items-center gap-1">
              @for (item of navItems; track item.route) {
                <a 
                  [routerLink]="item.route"
                  routerLinkActive="bg-carloc-50 text-carloc-700 border-b-2 border-carloc-600"
                  [routerLinkActiveOptions]="{exact: item.exact || false}"
                  class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:text-carloc-600 transition-all"
                >
                  <i [class]="'bi ' + item.icon" aria-hidden="true"></i>
                  <span>{{ item.label }}</span>
                </a>
              }
            </div>

            <!-- Right Section -->
            <div class="hidden md:flex items-center gap-3">
              
              <!-- Theme Toggle -->
              <button
                (click)="toggleTheme()"
                class="p-2 text-gray-500 hover:text-carloc-600 hover:bg-gray-100 rounded-lg transition-all"
                aria-label="Basculer le thème"
              >
                <i [class]="'bi text-lg ' + (isDarkTheme() ? 'bi-sun' : 'bi-moon')" aria-hidden="true"></i>
              </button>

              <!-- New Reservation CTA -->
              <a
                routerLink="/catalogue"
                class="inline-flex items-center gap-2 px-4 py-2 bg-carloc-600 hover:bg-carloc-700 text-white font-bold rounded-full transition-all hover:-translate-y-0.5 shadow-carloc"
              >
                <i class="bi bi-plus-lg" aria-hidden="true"></i>
                <span>Nouvelle réservation</span>
              </a>

              <!-- Separator -->
              <div class="w-px h-8 bg-gray-200"></div>

              <!-- User Menu -->
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-all">
                  <!-- Avatar -->
                  <div class="relative">
                    <div class="w-10 h-10 rounded-full ring-2 ring-carloc-200 overflow-hidden">
                      @if (userPhoto()) {
                        <img [src]="userPhoto()" [alt]="userLabel()" class="w-full h-full object-cover" />
                      } @else {
                        <div class="w-full h-full bg-gradient-to-br from-carloc-200 to-carloc-300 flex items-center justify-center text-carloc-700 font-bold text-sm">
                          {{ userShortLabel().slice(0,2).toUpperCase() }}
                        </div>
                      }
                    </div>
                    <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                  </div>

                  <!-- User Info -->
                  <div class="flex flex-col">
                    <span class="text-sm font-semibold text-gray-900">{{ userLabel() }}</span>
                    <span class="text-xs text-gray-500">{{ userEmail() }}</span>
                  </div>
                </div>

                <!-- Logout Button -->
                <button
                  (click)="logout()"
                  class="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  aria-label="Déconnexion"
                >
                  <i class="bi bi-box-arrow-right text-lg" aria-hidden="true"></i>
                </button>
              </div>
            </div>

            <!-- Mobile Menu Button -->
            <button
              (click)="toggleMenu()"
              class="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              aria-label="Menu"
            >
              <i [class]="'bi text-xl ' + (menuOpen() ? 'bi-x-lg' : 'bi-list')" aria-hidden="true"></i>
            </button>
          </div>

          <!-- Mobile Menu -->
          @if (menuOpen()) {
            <div class="md:hidden py-4 border-t border-gray-200 animate-slide-up">
              <div class="flex flex-col gap-2">
                @for (item of navItems; track item.route) {
                  <a 
                    [routerLink]="item.route"
                    routerLinkActive="bg-carloc-50 text-carloc-700 border-l-4 border-carloc-600"
                    [routerLinkActiveOptions]="{exact: item.exact || false}"
                    (click)="closeMenu()"
                    class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-all"
                  >
                    <i [class]="'bi ' + item.icon" aria-hidden="true"></i>
                    <span>{{ item.label }}</span>
                  </a>
                }
                
                <div class="h-px bg-gray-200 my-2"></div>
                
                <a
                  routerLink="/catalogue"
                  (click)="closeMenu()"
                  class="flex items-center justify-center gap-2 px-4 py-3 bg-carloc-600 hover:bg-carloc-700 text-white font-bold rounded-lg transition-all"
                >
                  <i class="bi bi-plus-lg" aria-hidden="true"></i>
                  <span>Nouvelle réservation</span>
                </a>
                
                <button
                  (click)="toggleTheme()"
                  class="flex items-center justify-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                >
                  <i [class]="'bi ' + (isDarkTheme() ? 'bi-sun' : 'bi-moon')" aria-hidden="true"></i>
                  <span>{{ isDarkTheme() ? 'Mode clair' : 'Mode sombre' }}</span>
                </button>
                
                <button
                  (click)="logout()"
                  class="flex items-center justify-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-all font-semibold"
                >
                  <i class="bi bi-box-arrow-right" aria-hidden="true"></i>
                  <span>Déconnexion</span>
                </button>
              </div>
            </div>
          }
        </div>
      </nav>

      <!-- Main Content -->
      <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <router-outlet></router-outlet>
      </main>

      <!-- Footer (Optional) -->
      <footer class="bg-white border-t border-gray-200 mt-auto">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div class="text-center text-sm text-gray-500">
            © 2026 CarLoc. Tous droits réservés.
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
