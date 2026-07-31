import { HttpErrorResponse } from '@angular/common/http';

import { ApiErrorResponse } from './api.models';

/**
 * Extrai a mensagem amigavel do corpo de erro padronizado da API (`ErrorResponseDto`), com fallback.
 *
 * Corpo unico de verdade para os helpers de dominio (`mensagemPixErro`, `mensagemCobrancaErro`, ...),
 * que continuam existindo com nome e comentario proprios: cada um documenta quais status aquele
 * dominio trata localmente, o que e informacao do call site e nao se generaliza.
 *
 * NAO confundir com `mensagemDeErroDeLogin`/`mensagemDeErroDeTotp`, que fazem switch por status.
 * Aqui nao ha discriminacao por status de proposito — quem chama ja decidiu que a copy do backend
 * serve, e so precisa de um fallback quando o corpo nao vier.
 *
 * O `err.error` chega como `unknown` na pratica: pode ser o DTO, `null` num 204/504 sem corpo, uma
 * `string` quando o servidor devolve HTML de proxy, ou um `ProgressEvent` em falha de rede. So o
 * primeiro caso tem `message`; os demais caem no padrao.
 */
export function mensagemDeErroDaApi(err: HttpErrorResponse, padrao: string): string {
  const corpo = err.error as ApiErrorResponse | undefined;
  return corpo?.message ?? padrao;
}
