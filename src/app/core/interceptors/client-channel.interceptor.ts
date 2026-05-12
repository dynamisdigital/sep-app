import { HttpInterceptorFn } from '@angular/common/http';

import { environment } from '../../../environments/environment';

/**
 * Adiciona `X-Client-Channel: WEB` e `withCredentials: true` em toda chamada
 * para a API (follow-up 5F-FIX-02 da Sprint 5).
 *
 * - `X-Client-Channel: WEB` sinaliza ao backend para emitir o refresh token via
 *   `Set-Cookie HttpOnly` (path `/api/v1/auth`) em vez de devolver no body.
 * - `withCredentials: true` faz o browser anexar/aceitar cookies cross-origin
 *   nas chamadas a API (em conjunto com `Access-Control-Allow-Credentials=true`).
 *
 * Aplica apenas a URLs que comecam com `environment.apiBaseUrl` para nao
 * vazar credenciais em requests para outros hosts (CDNs, analytics, etc.).
 */
export const clientChannelInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }
  return next(
    req.clone({
      setHeaders: { 'X-Client-Channel': 'WEB' },
      withCredentials: true,
    }),
  );
};
