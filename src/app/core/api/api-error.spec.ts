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
