import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginRequest, TokenResponse } from '../models/auth.model';

export type UserRole = 'admin' | 'gestionnaire' | 'client';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient, private router: Router) { }

  /**
   * Déduit le rôle depuis la réponse de connexion (champs API, utilisateur, ou claims JWT).
   */
  getRoleFromLoginResponse(data: TokenResponse): UserRole {
    const top = data.role;
    if (top === 'admin' || top === 'gestionnaire' || top === 'client') {
      return top;
    }
    const fromUser = data.user?.role;
    if (fromUser === 'admin' || fromUser === 'gestionnaire' || fromUser === 'client') {
      return fromUser;
    }
    if (data.user?.is_superuser) {
      return 'admin';
    }
    if (data.user?.is_staff) {
      return 'gestionnaire';
    }
    try {
      const payload = JSON.parse(atob(data.access.split('.')[1])) as {
        role?: string;
        is_staff?: boolean;
        is_superuser?: boolean;
      };
      if (payload.role === 'admin' || payload.is_superuser === true) {
        return 'admin';
      }
      if (payload.role === 'gestionnaire' || payload.is_staff === true) {
        return 'gestionnaire';
      }
    } catch {
      /* ignore */
    }
    return 'client';
  }

  /**
   * Cible après login : respecte returnUrl seulement si cohérent avec le rôle
   * (évite d'envoyer un client vers /admin ou un admin piégé par un ancien lien).
   */
  resolveRedirectAfterLogin(returnUrl: string | null | undefined, role: UserRole): string {
    const raw = (returnUrl ?? '').trim();

    if (role === 'admin') {
      if (raw.startsWith('/admin')) {
        return raw;
      }
      if (raw.startsWith('/gestionnaire')) {
        return raw;
      }
      return '/admin';
    }

    if (role === 'gestionnaire') {
      if (raw.startsWith('/gestionnaire')) {
        return raw;
      }
      if (raw.startsWith('/admin')) {
        return '/gestionnaire';
      }
      return '/gestionnaire';
    }

    if (raw.startsWith('/admin') || raw.startsWith('/gestionnaire')) {
      return '/client';
    }
    if (raw.startsWith('/client') || raw.startsWith('/catalogue')) {
      return raw;
    }
    if (raw && raw !== '/' && !raw.startsWith('/login') && !raw.startsWith('/inscription')) {
      return raw;
    }
    return '/client';
  }

  login(credentials: LoginRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.apiUrl}/login/`, credentials).pipe(
      tap(tokens => {
        const role = this.getRoleFromLoginResponse(tokens);
        this.setStorageItem('access_token', tokens.access);
        this.setStorageItem('refresh_token', tokens.refresh);
        this.setStorageItem('user_role', role);
        this.setStorageItem('user_info', JSON.stringify(tokens.user));
        const clientId = tokens.client_id ?? tokens.user?.client_id;
        if (clientId != null) {
          this.setStorageItem('client_id', String(clientId));
        } else {
          this.removeStorageItem('client_id');
        }
      })
    );
  }

  logout(): void {
    this.removeStorageItem('access_token');
    this.removeStorageItem('refresh_token');
    this.removeStorageItem('user_role');
    this.removeStorageItem('user_info');
    this.removeStorageItem('client_id');
    this.router.navigate(['/']);
  }

  getToken(): string | null {
    return this.getStorageItem('access_token');
  }

  getClientId(): number | null {
    const stored = this.getStorageItem('client_id');
    if (stored) {
      return parseInt(stored, 10);
    }
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.client_id ?? null;
    } catch {
      return null;
    }
  }

  getRole(): UserRole | null {

    const storedRole = this.getStorageItem('user_role');
    if (storedRole === 'admin' || storedRole === 'gestionnaire' || storedRole === 'client') {
      return storedRole;
    }

    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as {
        role?: string;
        is_staff?: boolean;
        is_superuser?: boolean;
      };
      if (payload.role === 'admin' || payload.is_superuser === true) {
        return 'admin';
      }
      if (payload.role === 'gestionnaire' || payload.is_staff === true) {
        return 'gestionnaire';
      }
      if (payload.role === 'client') {
        return 'client';
      }
      return 'client';
    } catch {
      return null;
    }
  }

  isAdmin(): boolean {
    return this.isLoggedIn() && this.getRole() === 'admin';
  }

  isGestionnaire(): boolean {
    return this.isLoggedIn() && this.getRole() === 'gestionnaire';
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  refreshToken(): Observable<{ access: string }> {
    const refresh = this.getStorageItem('refresh_token');

    return this.http.post<{ access: string }>(`${this.apiUrl}/refresh/`, { refresh }).pipe(
      tap(res => this.setStorageItem('access_token', res.access))
    );
    
  }

  private getStorageItem(key: string): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  }

  private setStorageItem(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  }

  private removeStorageItem(key: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  }
}
