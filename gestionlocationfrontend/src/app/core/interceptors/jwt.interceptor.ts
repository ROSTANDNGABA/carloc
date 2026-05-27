import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@app/auth/auth.service';
import { catchError, switchMap } from 'rxjs/operators';
import { throwError } from 'rxjs';

let isRefreshing = false;

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const isAuthRequest =
    req.url.includes('/auth/login/') ||
    req.url.includes('/auth/refresh/');

  const isPublicRequest =
    isAuthRequest ||
    (req.method === 'GET' && req.url.includes('/vehicules')) ||
    (req.method === 'POST' && req.url.includes('/clients/'));

  if (!isPublicRequest) {
    const token = authService.getToken();
    if (token) {
      req = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
    }
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthRequest && !isRefreshing) {
        isRefreshing = true;
        return authService.refreshToken().pipe(
          switchMap(({ access }) => {
            isRefreshing = false;
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${access}` },
            });
            return next(retryReq);
          }),
          catchError(refreshErr => {
            isRefreshing = false;
            authService.logout();
            return throwError(() => refreshErr);
          }),
        );
      }
      return throwError(() => error);
    })
  );
};
