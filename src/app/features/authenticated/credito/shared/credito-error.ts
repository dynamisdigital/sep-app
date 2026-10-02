import { HttpErrorResponse } from '@angular/common/http';

import { extrairMensagemErroSegura } from '../../../../core/api/api-error-sanitizer';

// Extrai a mensagem amigavel do corpo de erro padronizado da API, com fallback e sanitizacao.
// 401/403/423 sao tratados pelo errorInterceptor global (redirecionamento); aqui
// cobrimos 404/409/422/5xx e servem de fallback defensivo para 403 fora do app.
export function mensagemCreditoErro(err: HttpErrorResponse, padrao: string): string {
  return extrairMensagemErroSegura(err, padrao);
}
