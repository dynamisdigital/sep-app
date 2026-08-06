import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthService } from '../auth/auth.service';

import { ehRotaPublica } from './rotas-publicas';

/**
 * Anexa o `Authorization` da sessao, exceto em rota publica — a lista e a justificativa dela vivem
 * em [`rotas-publicas.ts`](./rotas-publicas.ts), compartilhadas com o `errorInterceptor`.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
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
