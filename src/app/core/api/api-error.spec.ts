import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { mensagemDeErroDaApi } from './api-error';

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
   * Comportamento real travado, nao desejado: `??` so cai no padrao para null/undefined, entao uma
   * `message` vazia passa direto e a tela fica sem texto. Nao alterado aqui de proposito — esta
   * Task e extracao, e trocar por `||` mudaria o comportamento dos 56 call sites de uma vez.
   *
   * Nao e alcancavel pelo `sep-api` hoje: `ErrorResponseDto` usa `@JsonInclude(NON_NULL)`, que
   * omite o campo nulo (caindo no padrao), e toda excecao passa um literal nao vazio. O teste
   * existe para que a mudanca seja deliberada, e nao um efeito colateral silencioso.
   */
  it('devolve string vazia quando message e vazia (comportamento atual do ??)', () => {
    expect(mensagemDeErroDaApi(erroCom({ message: '' }), PADRAO)).toBe('');
  });
});
