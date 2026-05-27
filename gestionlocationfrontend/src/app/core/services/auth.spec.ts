import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { AuthService } from '@app/auth/auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  const loginUrl = `${environment.apiUrl}/auth/login/`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should login successfully', () => {
    const credentials = { username: 'test@example.com', password: 'password123' };
    const mockResponse = {
      access: 'eyJhbGci.test',
      refresh: 'eyJhbGci.refresh',
      role: 'client' as const,
      user: {
        id: 1,
        username: 'test@example.com',
        email: 'test@example.com',
        is_staff: false,
        role: 'client' as const,
      },
      client_id: 1,
    };

    service.login(credentials).subscribe(() => {
      expect(localStorage.getItem('access_token')).toBe('eyJhbGci.test');
      expect(localStorage.getItem('user_role')).toBe('client');
    });

    const req = httpMock.expectOne(loginUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(credentials);
    req.flush(mockResponse);
  });

  it('should detect admin role from login response', () => {
    const role = service.getRoleFromLoginResponse({
      access: 'token',
      refresh: 'refresh',
      role: 'admin',
      client_id: null,
      user: {
        id: 1,
        username: 'admin@test.com',
        email: 'admin@test.com',
        is_staff: true,
        role: 'admin',
      },
    });
    expect(role).toBe('admin');
  });

  it('should logout and clear storage', () => {
    localStorage.setItem('access_token', 'test_token');
    localStorage.setItem('user_role', 'client');
    service.logout();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('user_role')).toBeNull();
  });

  it('should redirect client away from admin returnUrl', () => {
    const target = service.resolveRedirectAfterLogin('/admin/dashboard', 'client');
    expect(target).toBe('/client');
  });
});
