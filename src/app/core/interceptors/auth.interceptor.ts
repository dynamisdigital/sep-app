import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthService } from '../auth/auth.service';

/**
 * Endpoints `permitAll` do sep-api, que nunca devem receber `Authorization`.
 *
 * Nao e cosmetica. Um token velho ainda no storage faz o `JwtAuthenticationFilter` responder 401
 * ANTES de olhar a autorizacao — e o `errorInterceptor` isenta do redirect de 401 apenas
 * `/auth/login` (`error.interceptor.ts`), entao o 401 dispara `clearSession()` +
 * `navigateByUrl('/login')`. Em `/auth/politica-lockout` isso nao degrada a copy da pagina de conta
 * bloqueada: ARRANCA o usuario da pagina que o 423 acabou de abrir. O cenario e comum, nao teorico —
 * `/account-locked` e alcancavel por URL direta e por reload, e nesses caminhos ninguem limpou o
 * token antes.
 *
 * Lista, e nao um `HttpContextToken` como `TRATA_403_LOCALMENTE`: aquele token existe porque o
 * interceptor NAO pode inferir se a tela trata 403 localmente — e decisao do call site. Ser publico
 * e propriedade do endpoint, que o interceptor le da URL; um token faria cada chamador ter de
 * lembrar, e esquecer voltaria ao bug em silencio.
 */
const ROTAS_SEM_AUTHORIZATION = ['/auth/login', '/auth/politica-lockout'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getAccessToken();
  const rotaPublica = ROTAS_SEM_AUTHORIZATION.some((rota) => req.url.includes(rota));

  if (!token || rotaPublica) {
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
