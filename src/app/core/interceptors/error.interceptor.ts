import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { withSupportReference } from '../api/support-reference';
import { AuthService } from '../auth/auth.service';

import { ehRotaPublica } from './rotas-publicas';

// F-16 (fix code review): requests cuja tela trata 403 localmente (ex.: decisao de
// renegociacao do tomador — estado neutro na leitura, reverificacao explicita no aceite)
// suprimem o redirect global para /access-denied. 401/423 continuam sempre globais.
export const TRATA_403_LOCALMENTE = new HttpContextToken<boolean>(() => false);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401 && !ehRotaPublica(req.url)) {
          auth.clearSession();
          void router.navigateByUrl('/login');
        }

        if (
          error.status === 403 &&
          !ehRotaPublica(req.url) &&
          !req.context.get(TRATA_403_LOCALMENTE)
        ) {
          void router.navigateByUrl('/access-denied');
        }

        // Sprint 5: 423 Locked = conta bloqueada por lockout.
        // NAO consulta `ehRotaPublica`, ao contrario do 401/403 acima, e a assimetria e deliberada:
        // o 423 chega justamente de `/auth/login`, que E rota publica, e e esta navegacao que ABRE a
        // /account-locked. Isentar rota publica aqui mataria o unico caminho que leva o usuario ate
        // a pagina — o oposto do defeito que a isencao do 401/403 conserta.
        if (error.status === 423) {
          auth.clearSession();
          void router.navigateByUrl('/account-locked');
        }

        // Sprint 5: 429 Too Many Requests = rate limit excedido.
        // Mantido como erro propagado; tela de login/verify exibe a mensagem.
      }

      return throwError(() =>
        error instanceof HttpErrorResponse ? withSupportReference(error) : error,
      );
    }),
  );
};
