export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access: string;
  refresh: string;
  /** Présent sur l’API CarLoc ; le service peut aussi le déduire via `user` ou le JWT. */
  role?: 'admin' | 'gestionnaire' | 'client';
  client_id: number | null;
  user: AuthUser;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'gestionnaire' | 'client';
  is_staff: boolean;
  is_superuser?: boolean;
  client_id?: number | null;
}
