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
 *
 * `message` em branco tambem cai no padrao, e o produtor NAO e o `ErrorResponseDto`: aquele usa
 * `@JsonInclude(NON_NULL)`, que omite o campo nulo, e toda excecao da aplicacao passa um literal nao
 * vazio. Quem produz e o caminho de erro do proprio Spring — `response.sendError(...)` num filtro, ou
 * uma excecao sem `@ExceptionHandler` (o `405`, por exemplo) —, porque `server.error.include-message`
 * nao esta configurado no `sep-api` e o default do Boot e `never`, emitindo `"message": ""`.
 * Com `??` a string vazia passava adiante e o `@if` do template, que a trata como falsy, nao criava o
 * no `role="alert"`: a tela ficava **muda** depois do erro.
 */
export function mensagemDeErroDaApi(err: HttpErrorResponse, padrao: string): string {
  const corpo = err.error as ApiErrorResponse | undefined;
  const mensagem = corpo?.message?.trim();
  // `||` e nao `??`: depois do `trim` a unica string falsy e a vazia, que e exatamente o caso a
  // rejeitar. `message` e `string` no contrato, entao `0`/`false` nunca chegam aqui — a ressalva
  // usual contra `||` nao se aplica.
  return mensagem || padrao;
}
