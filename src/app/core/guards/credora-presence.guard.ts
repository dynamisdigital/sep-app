import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { CredoraService } from '../credora/credora.service';

// Presenca de credora para a area /app/credora. A autenticacao ja e garantida pelo authGuard do
// shell autenticado (rota pai); este guard protege apenas as rotas que exigem credora cadastrada
// (perfil, oportunidades, carteira). O backend responde 404 em GET /credores/me quando o usuario
// ainda nao tem credora — nesse caso roteamos ao cadastro, em vez de exibir tela quebrada. Erros
// nao-404 liberam a navegacao para a propria pagina surfacar a falha. A regra continua no backend;
// aqui e apenas UX de roteamento.
export const credoraPresenceGuard: CanActivateFn = () => {
  const credora = inject(CredoraService);
  const router = inject(Router);

  return credora.consultarMinhaCredora().pipe(
    map(() => true),
    catchError((error: HttpErrorResponse) =>
      of(error.status === 404 ? router.parseUrl('/app/credora/cadastro') : true),
    ),
  );
};
