import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clientAuthGuard } from './client-auth.guard';
import { AuthService } from '@app/auth/auth.service';

describe('clientAuthGuard', () => {
  const routerMock = {
    navigate: vi.fn(),
  };

  const authServiceMock = {
    isLoggedIn: vi.fn(),
  };

  beforeEach(() => {
    routerMock.navigate.mockReset();
    authServiceMock.isLoggedIn.mockReset();

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
      clientAuthGuard({} as never, { url: '/profil' } as never)
    );

    expect(result).toBeFalsy();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/profil' },
    });
  });

  it('autorise l acces quand l utilisateur est connecte', () => {
    authServiceMock.isLoggedIn.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      clientAuthGuard({} as never, { url: '/profil' } as never)
    );

    expect(result).toBeTruthy();
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });
});
