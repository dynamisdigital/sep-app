import { describe, expect, it } from 'vitest';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';

import { esperaDoRetryAfter } from './retry-after';

function erroCom(retryAfter?: string): HttpErrorResponse {
  return new HttpErrorResponse({
    status: 423,
    headers:
      retryAfter === undefined ? new HttpHeaders() : new HttpHeaders({ 'Retry-After': retryAfter }),
  });
}

describe('esperaDoRetryAfter', () => {
  it('arredonda para cima, para nao prometer a liberacao antes da hora', () => {
    // 1743s = 29min03s. "29 minutos" mandaria o usuario tentar de novo e falhar.
    expect(esperaDoRetryAfter(erroCom('1743'))).toBe('30 minutos');
  });

  it('colapsa espera sub-minuto em um minuto', () => {
    expect(esperaDoRetryAfter(erroCom('1'))).toBe('1 minuto');
  });

  it('flexiona o singular em exatamente um minuto', () => {
    // Valor do 429 do sep-api: PERIODO_DE_REFRESH = 60s, constante.
    expect(esperaDoRetryAfter(erroCom('60'))).toBe('1 minuto');
  });

  it('devolve null quando o header nao veio', () => {
    // Sem o guard, `Number(null)` e 0 e a tela exibiria "0 minutos" — pior que a frase generica.
    expect(esperaDoRetryAfter(erroCom())).toBeNull();
  });

  it('devolve null para a forma HTTP-date, que o sep-api nao emite', () => {
    expect(esperaDoRetryAfter(erroCom('Wed, 21 Oct 2015 07:28:00 GMT'))).toBeNull();
  });

  it('devolve null para valor negativo', () => {
    expect(esperaDoRetryAfter(erroCom('-30'))).toBeNull();
  });
});
