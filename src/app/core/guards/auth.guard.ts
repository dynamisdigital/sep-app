import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';

import { AuthService } from '../auth/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.getAccessToken()) {
    return router.parseUrl('/login');
  }

  if (auth.currentUser()) {
    return true;
  }

  return auth.loadCurrentUser().pipe(
    map(() => true as const),
    catchError(() => {
      auth.clearSession();
      return of(router.parseUrl('/login'));
    }),
  );
};
