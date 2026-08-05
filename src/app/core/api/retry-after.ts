import { HttpErrorResponse } from '@angular/common/http';

/**
 * Le o `Retry-After` de um erro da API e devolve a espera ja em texto, ou `null` quando o header
 * nao veio ou nao e utilizavel.
 *
 * O sep-api emite SEGUNDOS (`integer` no OpenAPI, `ApiExceptionHandler` no 423 e `RateLimitFilter`
 * no 429), nunca a forma HTTP-date do RFC 9110. Essa forma NAO e implementada de proposito: nao
 * existe no contrato, e um parser de data aqui seria codigo sem chamador. Se um dia aparecer, ela
 * cai no guard abaixo (`Number('Wed, 21 Oct...')` e `NaN`) e o call site volta ao literal — degrada
 * para a frase generica em vez de exibir "Tente novamente em NaN minutos".
 *
 * Arredonda para CIMA: prometer a liberacao antes da hora manda o usuario tentar de novo e falhar.
 * Abaixo de um minuto o `ceil` colapsa para "1 minuto" — pedir ate 59s a mais de paciencia custa
 * menos que um retry frustrado, e evita a gramatica quebrada de "aguarde cerca de menos de 1
 * minuto".
 *
 * Devolve texto, e nao numero, porque a pluralizacao anda junto da conversao e as duas telas que
 * consomem usam exatamente a mesma frase.
 *
 * O header so chega ao browser porque `app.cors.exposed-headers` o declara no sep-api — ele nao e
 * CORS-safelisted. Isso NAO e observavel nos testes: o MSW monta a resposta localmente e nao emula
 * a filtragem que o browser aplica em XHR cross-origin. So um smoke real contra :8080 prova.
 */
export function esperaDoRetryAfter(erro: HttpErrorResponse): string | null {
  const segundos = Number(erro.headers.get('Retry-After'));
  if (!Number.isFinite(segundos) || segundos <= 0) {
    return null;
  }
  const minutos = Math.ceil(segundos / 60);
  return `${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
}
