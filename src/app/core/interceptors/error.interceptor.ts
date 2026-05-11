import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401 && !req.url.includes('/auth/login')) {
          auth.clearSession();
          void router.navigateByUrl('/login');
        }

        if (error.status === 403) {
          void router.navigateByUrl('/access-denied');
        }

        // Sprint 5: 423 Locked = conta bloqueada por lockout.
        if (error.status === 423) {
          auth.clearSession();
          void router.navigateByUrl('/account-locked');
        }

        // Sprint 5: 429 Too Many Requests = rate limit excedido.
        // Mantido como erro propagado; tela de login/verify exibe a mensagem.
      }

      return throwError(() => error);
    }),
  );
};
