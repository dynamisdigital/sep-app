import { HttpErrorResponse } from '@angular/common/http';

import { ApiErrorResponse } from './api.models';

const TERMOS_TECNICOS_SENSIVEIS =
  /exception|stacktrace|sqlstate|hibernate|jdbc|postgresql|syntax error|nullpointer|driver\b/i;

/**
 * SEP — Frontend Security Architecture
 * Sanitização e Proteção contra Exposição de Erros Técnicos / Stack Traces (SEC-07 / OWASP ASVS)
 *
 * Em caso de falhas internas do backend (HTTP 500, 502, 503), APIs mal configuradas podem
 * retornar detalhes de infraestrutura, nomes de tabelas, consultas SQL ou excecoes do Java/Node.
 *
 * Esta funcao garante que detalhes tecnicos internos nunca alcancem a interface do usuario,
 * retornando a mensagem funcional amigavel padrao.
 */
export function extrairMensagemErroSegura(err: HttpErrorResponse, padrao: string): string {
  const apiErr = err.error as ApiErrorResponse | undefined;
  const mensagem = apiErr?.message;

  if (!mensagem) {
    return padrao;
  }

  if (err.status >= 500 && TERMOS_TECNICOS_SENSIVEIS.test(mensagem)) {
    return padrao;
  }

  return mensagem;
}
