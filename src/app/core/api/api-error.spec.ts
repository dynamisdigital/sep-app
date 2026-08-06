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
   * F-24.3 inverteu o comportamento que a F-22 havia deixado travado aqui. O teste anterior fixava
   * `''` como retorno e justificava-se dizendo que o caso "nao e alcancavel pelo `sep-api`", porque
   * `ErrorResponseDto` usa `@JsonInclude(NON_NULL)` e toda excecao da aplicacao passa um literal nao
   * vazio. **As duas premissas sao verdadeiras e a conclusao nao**: o produtor nao e o
   * `ErrorResponseDto`, e o caminho de erro do proprio Spring — `response.sendError(...)` num filtro,
   * ou excecao sem `@ExceptionHandler` (o `405`) —, que emite `"message": ""` porque
   * `server.error.include-message` nao esta configurado no `sep-api`. A mesma F-22 registrou esse
   * produtor em `verify-totp.component.ts` ao escolher `||`; os dois registros se contradiziam.
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
});
