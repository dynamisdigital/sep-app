import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

import { ehRotaPublica } from './rotas-publicas';

/**
 * Anexa o `Authorization` da sessao, exceto em rota publica — a lista e a justificativa dela vivem
 * em [`rotas-publicas.ts`](./rotas-publicas.ts), compartilhadas com o `errorInterceptor`.
 *
 * Hardening (SEC-03): o token e anexado APENAS se a URL comecar por `environment.apiBaseUrl`.
 * Isso impede que o token de acesso seja vazado para dominios de terceiros (CDNs, analytics,
 * servicos de CEP, Open Finance externo, etc.).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const token = auth.getAccessToken();

  if (!token || ehRotaPublica(req.url)) {
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
