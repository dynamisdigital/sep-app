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
 * **Mensagem em branco tambem cai no padrao. Isto e guarda defensiva, nao correcao de bug
 * observado** — e a versao anterior deste comentario errava justamente aqui, entao vale o registro
 * do que foi medido:
 *
 * - O caminho de erro default do Spring **nao** e o produtor. Com `server.error.include-message`
 *   ausente (default `never`), `ErrorAttributeOptions.retainIncluded` faz `Map.remove` da chave —
 *   conferido no bytecode do `spring-boot-3.5.5.jar` que o `sep-api` fixa, e nao ha nenhuma
 *   constante de string vazia em `DefaultErrorAttributes`. O corpo sai **sem** `message`, o que o
 *   `??` anterior ja tratava certo. O `405` tambem nao serve de exemplo: cai no
 *   `@ExceptionHandler(Exception.class)` do `ApiExceptionHandler` e volta 500 com literal.
 * - Quem **e** estruturalmente capaz de emitir branco e o proprio `ErrorResponseDto`:
 *   `DomainException` (`shared/exception/DomainException.java:20-27`) faz `super(mensagem)` sem
 *   validar nulo nem branco, e o `@JsonInclude(NON_NULL)` suprime so `null`, nunca `""`. Dois pontos
 *   encaminham `ex.getMessage()` de terceiros (`IniciarOnboardingPessoaUseCase.java:64`,
 *   `IniciarOnboardingEmpresaUseCase.java:80`). Hoje nenhum caminho conhecido emite branco; nada no
 *   tipo impede.
 * - Proxies e gateways entre o browser e o `sep-api` sao a outra origem plausivel.
 *
 * O estrago que a guarda evita: com `""`, o `@if` do template trata como falsy e nao cria o no
 * `role="alert"` — a tela fica **muda** depois do erro. Pior, onde o irmao e
 * `@if (!loading() && !errorMessage())`, o estado vazio renderiza como se a requisicao tivesse
 * dado certo. Com `"   "` o no e criado em branco, e o leitor de tela anuncia um alerta sem conteudo.
 */
export function mensagemDeErroDaApi(err: HttpErrorResponse, padrao: string): string {
  return mensagemBrutaDaApi(err) ?? padrao;
}

/**
 * A mensagem do corpo, aparada, ou `undefined` quando nao ha nenhuma utilizavel — inclusive quando
 * vem vazia ou so com espacos. Existe separada porque `login` e `verify-totp` precisam do valor
 * cru para escolher entre ele e um literal proprio por status, e antes repetiam este cast inline.
 *
 * A checagem de `typeof` nao e cerimonia: `err.error` e `unknown` de fato, o irmao
 * `support-reference.ts` ja narra o mesmo campo antes de usar, e sem ela um `message` nao-string
 * (proxy que devolve JSON com numero) faria `.trim()` **lancar** dentro do callback de erro — o
 * `loading.set(false)` que vem depois nunca rodaria e a tela ficaria carregando para sempre.
 */
export function mensagemBrutaDaApi(err: HttpErrorResponse): string | undefined {
  const bruto = (err.error as ApiErrorResponse | undefined)?.message;
  const mensagem = typeof bruto === 'string' ? bruto.trim() : undefined;
  return mensagem === '' ? undefined : mensagem;
}
