import { HttpErrorResponse } from '@angular/common/http';

import { mensagemDeErroDaApi } from './api-error';

/**
 * SEC-07 (OWASP ASVS): em falha interna do backend, detalhe tecnico nunca chega a interface.
 *
 * Mantido so por compatibilidade com os chamadores do front que nasceu depois do MVP: a regra agora
 * vive em `mensagemDeErroDaApi` (api-error.ts), unica para o sistema todo. Prefira aquela.
 */
export function extrairMensagemErroSegura(err: HttpErrorResponse, padrao: string): string {
  return mensagemDeErroDaApi(err, padrao);
}
