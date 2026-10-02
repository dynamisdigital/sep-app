import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

/**
 * Anexa o token de acesso (Bearer) nas chamadas HTTP para o backend do SEP.
 *
 * Hardening (SEC-03): O token e anexado APENAS se a URL comecar por `environment.apiBaseUrl`.
 * Isso impede que o token de acesso seja vazado acidentalmente para dominios de terceiros
 * (CDNs, analytics, servicos de CEP, Open Finance externo, etc.).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const token = auth.getAccessToken();
  const isLoginRequest = req.url.includes('/auth/login');

  if (!token || isLoginRequest) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    }),
  );
};
