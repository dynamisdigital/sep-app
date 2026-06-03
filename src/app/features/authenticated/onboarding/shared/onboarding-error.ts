import { HttpErrorResponse } from '@angular/common/http';

import { ApiErrorResponse } from '../../../../core/api/api.models';

// Extrai a mensagem amigavel do corpo de erro padronizado da API, com fallback.
// O frontend nao interpreta o status como regra de negocio; apenas apresenta o
// texto devolvido pelo backend. 401/403/423 ja sao tratados pelo errorInterceptor
// global (redirecionamento), entao aqui cobrimos 400/404/409/5xx.
export function mensagemOnboardingErro(err: HttpErrorResponse, padrao: string): string {
  const apiErr = err.error as ApiErrorResponse | undefined;
  return apiErr?.message ?? padrao;
}
