import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { codigoDeErroDaApi, mensagemDeErroDaApi } from './api-error';

const PADRAO = 'Nao foi possivel concluir a operacao.';

function erroCom(corpo: unknown, status = 400): HttpErrorResponse {
  return new HttpErrorResponse({ error: corpo, status });
}

describe('mensagemDeErroDaApi', () => {
  it('usa o message do corpo padronizado da API', () => {
    const erro = erroCom({
      timestamp: '2026-07-31T09:00:00Z',
      status: 409,
      error: 'Conflict',
      message: 'Chave Pix ja cadastrada para esta conta.',
      path: '/api/v1/pix/chaves',
    });

    expect(mensagemDeErroDaApi(erro, PADRAO)).toBe('Chave Pix ja cadastrada para esta conta.');
  });

  it('cai no padrao quando nao ha corpo (504 de gateway, 204 sem body)', () => {
    expect(mensagemDeErroDaApi(erroCom(null, 504), PADRAO)).toBe(PADRAO);
  });

  it('cai no padrao quando o corpo nao e objeto (HTML de proxy)', () => {
    expect(mensagemDeErroDaApi(erroCom('<html>502 Bad Gateway</html>', 502), PADRAO)).toBe(PADRAO);
  });

  it('cai no padrao quando o corpo e objeto sem message', () => {
    expect(mensagemDeErroDaApi(erroCom({ status: 400, error: 'Bad Request' }), PADRAO)).toBe(
      PADRAO,
    );
  });

  // Falha de rede: o browser entrega ProgressEvent, nao JSON. Sem isto o usuario veria "undefined".
  it('cai no padrao em falha de rede, onde o corpo e um ProgressEvent', () => {
    expect(mensagemDeErroDaApi(erroCom(new ProgressEvent('error'), 0), PADRAO)).toBe(PADRAO);
  });

  /**
   * F-24.3 inverteu o comportamento que a F-22 havia deixado travado aqui: o teste anterior fixava
   * `''` como retorno esperado. O raciocinio da F-22 apontava o `ErrorResponseDto` como inocente e o
   * caminho default do Spring como culpado; medido, **e o contrario** — ver o docblock de
   * `api-error.ts`, que e a casa unica dessa explicacao. Em resumo: o Boot **remove** a chave
   * `message` quando `include-message` e `never`, entao aquele caminho nunca produziu `""`, e quem
   * pode produzir e o proprio DTO da aplicacao, cujo `DomainException` nao valida a mensagem.
   * A guarda e defensiva; nao ha caminho conhecido emitindo branco hoje.
   */
  it('cai no padrao quando message e string vazia', () => {
    expect(mensagemDeErroDaApi(erroCom({ message: '' }), PADRAO)).toBe(PADRAO);
  });

  /**
   * Segunda metade do defeito, e a que sobrevive a uma correcao so do operador: com `||` sem `trim`,
   * `'   '` e truthy e venceria o padrao — a tela renderizaria o no `role="alert"` em branco, que e
   * pior que o padrao porque o leitor de tela anuncia um alerta vazio.
   */
  it('cai no padrao quando message e so espaco em branco', () => {
    expect(mensagemDeErroDaApi(erroCom({ message: '   ' }), PADRAO)).toBe(PADRAO);
  });

  it('preserva espacos internos e apara so as bordas', () => {
    expect(mensagemDeErroDaApi(erroCom({ message: '  Chave Pix ja cadastrada.  ' }), PADRAO)).toBe(
      'Chave Pix ja cadastrada.',
    );
  });

  /**
   * `err.error` e `unknown` de fato, e o `?.` do encadeamento so cobre null/undefined: sem a checagem
   * de `typeof`, um `message` nao-string faria `.trim()` **lancar** dentro do callback de erro. Os
   * chamadores fazem `loading.set(false)` DEPOIS de montar a mensagem, entao a excecao deixaria a
   * tela carregando para sempre — falha pior do que a que esta Task veio corrigir.
   */
  it.each([
    ['numero', 123],
    ['booleano', true],
    ['objeto', { codigo: 500 }],
  ])('cai no padrao quando message e %s, sem lancar', (_tipo, valor) => {
    expect(() => mensagemDeErroDaApi(erroCom({ message: valor }), PADRAO)).not.toThrow();
    expect(mensagemDeErroDaApi(erroCom({ message: valor }), PADRAO)).toBe(PADRAO);
  });
});

/**
 * `ErrorResponseDto.codigo`, publicado pela Sprint 36 do `sep-api`. O campo escolhe o RAMO; o
 * `message` continua escolhendo a FRASE — ver o docblock de `copy-de-erro.ts`. Por isso este helper
 * nao consulta catalogo nenhum: validar contra uma lista local faria o web recusar codigo que o
 * backend passe a publicar depois, e a tela cairia no ramo legado sem ninguem notar.
 *
 * A matriz abaixo repete a do irmao `mensagemBrutaDaApi` de proposito. As duas guardam a mesma
 * fronteira (`err.error` e `unknown` de fato) e o mesmo estrago: um `.trim()` sobre valor nao-string
 * **lanca dentro do callback de erro**, e o `loading.set(false)` que vem depois nunca roda — a tela
 * fica carregando para sempre. Isso e pior que nao ter o codigo.
 */
describe('codigoDeErroDaApi', () => {
  it('extrai o codigo do corpo padronizado da API', () => {
    const erro = erroCom({
      timestamp: '2026-09-08T09:00:00Z',
      status: 400,
      error: 'Bad Request',
      message: 'Codigo invalido.',
      path: '/api/v1/auth/totp/verify',
      codigo: 'MFA-400-002',
    });

    expect(codigoDeErroDaApi(erro)).toBe('MFA-400-002');
  });

  /**
   * O caso que sustenta o criterio de aceite 5 da spec: o campo e opcional no contrato porque o
   * backend so publica um subconjunto da taxonomia e porque `401`/`403`/`429` da cadeia de seguranca
   * nunca passam pelo `@RestControllerAdvice`. Backend anterior a 36 produz exatamente este corpo.
   */
  it('devolve undefined quando o corpo nao tem codigo (backend anterior a 36)', () => {
    const erro = erroCom({
      timestamp: '2026-09-08T09:00:00Z',
      status: 400,
      error: 'Bad Request',
      message: 'Codigo invalido.',
      path: '/api/v1/auth/totp/verify',
    });

    expect(codigoDeErroDaApi(erro)).toBeUndefined();
  });

  it('devolve undefined quando nao ha corpo (504 de gateway, 204 sem body)', () => {
    expect(codigoDeErroDaApi(erroCom(null, 504))).toBeUndefined();
  });

  it('devolve undefined quando o corpo nao e objeto (HTML de proxy)', () => {
    expect(codigoDeErroDaApi(erroCom('<html>502 Bad Gateway</html>', 502))).toBeUndefined();
  });

  it('devolve undefined em falha de rede, onde o corpo e um ProgressEvent', () => {
    expect(codigoDeErroDaApi(erroCom(new ProgressEvent('error'), 0))).toBeUndefined();
  });

  /**
   * Codigo em branco nao e codigo. Sem o `trim`, `'   '` seria truthy e um `switch` sobre ele
   * escolheria o ramo `default` achando que recebeu identificador — pior que `undefined`, que ao
   * menos declara ausencia e cai no tratamento legado por status.
   */
  it.each([
    ['string vazia', ''],
    ['so espacos', '   '],
  ])('devolve undefined quando o codigo e %s', (_caso, valor) => {
    expect(codigoDeErroDaApi(erroCom({ codigo: valor }))).toBeUndefined();
  });

  it('apara as bordas do codigo', () => {
    expect(codigoDeErroDaApi(erroCom({ codigo: '  MFA-400-004  ' }))).toBe('MFA-400-004');
  });

  /**
   * `null` entra na lista separado dos demais porque o encadeamento opcional (`?.`) ja o cobre, e um
   * refactor que troque `?.` por acesso direto continuaria passando nos outros casos. `array` idem:
   * `[].codigo` e `undefined` sem lancar, entao so este caso denuncia quem passar a confiar na forma.
   */
  it.each([
    ['null', null],
    ['numero', 400],
    ['booleano', false],
    ['objeto', { valor: 'MFA-400-002' }],
    ['array', ['MFA-400-002']],
  ])('devolve undefined quando o codigo e %s, sem lancar', (_tipo, valor) => {
    expect(() => codigoDeErroDaApi(erroCom({ codigo: valor }))).not.toThrow();
    expect(codigoDeErroDaApi(erroCom({ codigo: valor }))).toBeUndefined();
  });

  /**
   * O `verify-totp` chama por `mensagemDeErroDeTotp(erro: unknown)`, que so estreita para
   * `HttpErrorResponse` DEPOIS de um `instanceof`. Se algum call site futuro inverter a ordem, este
   * helper nao pode ser o que lanca — dai o cast deliberado aqui.
   */
  it('nao lanca quando recebe valor que nao e HttpErrorResponse', () => {
    const naoEhErroHttp = { mensagem: 'objeto qualquer' } as unknown as HttpErrorResponse;

    expect(() => codigoDeErroDaApi(naoEhErroHttp)).not.toThrow();
    expect(codigoDeErroDaApi(naoEhErroHttp)).toBeUndefined();
  });
});
