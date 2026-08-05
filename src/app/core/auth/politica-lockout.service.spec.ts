import { describe, expect, it, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpResponse, http } from 'msw';

import { PoliticaLockoutService } from './politica-lockout.service';
import { PoliticaLockoutResponse } from '../api/api.models';
import { server } from '../../../mocks/server';

const URL_POLITICA = 'http://localhost:8080/api/v1/auth/politica-lockout';

/**
 * Captura o valor EMITIDO, e nao o desfecho do observable.
 *
 * Escrever isto como `subscribe({ next: resolve, error: () => resolve(null) })` faria os mutantes
 * sobreviverem: sem o `catchError` do servico o observable erra, `next` nunca dispara, e um teste
 * que aceita o ramo de erro passa dos dois jeitos. Aqui o ramo de erro REJEITA — o contrato do
 * servico e nunca chegar la.
 */
function valorEmitido(service: PoliticaLockoutService): Promise<PoliticaLockoutResponse | null> {
  return new Promise((resolve, reject) => {
    service.consultar().subscribe({
      next: resolve,
      error: (erro: unknown) =>
        reject(new Error(`consultar() propagou erro, o que ela nunca deve fazer: ${String(erro)}`)),
    });
  });
}

describe('PoliticaLockoutService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
  });

  it('devolve os tres numeros vindos do endpoint', async () => {
    const politica = await valorEmitido(TestBed.inject(PoliticaLockoutService));

    expect(politica).toEqual({ maxAttempts: 5, windowMinutes: 15, lockoutMinutes: 30 });
  });

  it('devolve null quando a chamada falha, em vez de propagar o erro', async () => {
    // A pagina que consome isto e destino de redirect e alcancavel por URL direta: ela precisa
    // renderizar completa mesmo com o backend fora do ar.
    server.use(http.get(URL_POLITICA, () => new HttpResponse(null, { status: 500 })));

    const politica = await valorEmitido(TestBed.inject(PoliticaLockoutService));

    expect(politica).toBeNull();
  });

  it('devolve null para corpo sem os tres campos', async () => {
    // O springdoc nao emite `required` neste schema, entao o contrato NAO garante os campos; sem
    // esta guarda a tela renderizaria "por ate undefined minutos".
    server.use(http.get(URL_POLITICA, () => HttpResponse.json({})));

    const politica = await valorEmitido(TestBed.inject(PoliticaLockoutService));

    expect(politica).toBeNull();
  });

  it('devolve null para valor nao-positivo, que nao descreve politica nenhuma', async () => {
    server.use(
      http.get(URL_POLITICA, () =>
        HttpResponse.json({ maxAttempts: 5, windowMinutes: 15, lockoutMinutes: 0 }),
      ),
    );

    const politica = await valorEmitido(TestBed.inject(PoliticaLockoutService));

    expect(politica).toBeNull();
  });
});
