import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authGuard } from './auth.guard';
import { AuthService } from '@app/auth/auth.service';

describe('authGuard', () => {
  const routerMock = {
    navigate: vi.fn(),
  };

  const authServiceMock = {
    isLoggedIn: vi.fn(),
    isAdmin: vi.fn(),
  };

  beforeEach(() => {
    routerMock.navigate.mockReset();
    authServiceMock.isLoggedIn.mockReset();
    authServiceMock.isAdmin.mockReset();

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    });
  });

  it('redirige vers login quand l utilisateur n est pas connecte', () => {
    authServiceMock.isLoggedIn.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/admin/dashboard' } as never)
    );

    expect(result).toBeFalsy();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/admin/dashboard' },
    });
  });

  it('autorise l acces admin quand l utilisateur est administrateur', () => {
    authServiceMock.isLoggedIn.mockReturnValue(true);
    authServiceMock.isAdmin.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/admin/dashboard' } as never)
    );

    expect(result).toBeTruthy();
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('redirige vers le catalogue quand un client tente d acces admin', () => {
    authServiceMock.isLoggedIn.mockReturnValue(true);
    authServiceMock.isAdmin.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/admin/dashboard' } as never)
    );

    expect(result).toBeFalsy();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/catalogue']);
  });
});
