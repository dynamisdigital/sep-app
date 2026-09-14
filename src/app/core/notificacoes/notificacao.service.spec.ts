import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { NotificacaoResponse, NotificacoesNaoLidasResponse, PageResponse } from '../api/api.models';
import { NotificacaoService } from './notificacao.service';

// Contrato HTTP exato da central (backend Sprint 38). O dono vem do token: nenhuma chamada leva
// usuario por parametro, e a leitura nao tem corpo nem Idempotency-Key (o POST e idempotente).
describe('NotificacaoService (contrato HTTP)', () => {
  let service: NotificacaoService;
  let httpMock: HttpTestingController;
  const base = 'http://localhost:8080/api/v1/notificacoes';
  const ID = '1f0a8c2e-7d3b-6e10-9a4f-2b7c5d8e9f00';

  const item: NotificacaoResponse = {
    id: ID,
    tipo: 'DESEMBOLSO_PIX_CONCLUIDO',
    titulo: 'Desembolso concluido',
    mensagem: 'A transferencia Pix do desembolso do seu contrato foi concluida.',
    criadaEm: '2026-09-14T10:00:00-03:00',
    lidaEm: null,
    referencia: { tipo: 'CONTRATO', id: '1f0a8c2e-7d3b-6e10-9a4f-2b7c5d8e9f01' },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NotificacaoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('listar: GET /notificacoes com page e size, sem parametro de dono', async () => {
    const pagina: PageResponse<NotificacaoResponse> = {
      content: [item],
      totalElements: 21,
      totalPages: 3,
      number: 2,
      size: 10,
      first: false,
      last: true,
      numberOfElements: 1,
      empty: false,
    };
    const resposta = new Promise<PageResponse<NotificacaoResponse>>((resolve) => {
      service.listar(2, 10).subscribe(resolve);
    });

    const req = httpMock.expectOne((r) => r.url === base);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().sort()).toEqual(['page', 'size']);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('10');
    req.flush(pagina);

    expect(await resposta).toEqual(pagina);
  });

  it('contarNaoLidas: GET /notificacoes/nao-lidas/contagem', async () => {
    const resposta = new Promise<NotificacoesNaoLidasResponse>((resolve) => {
      service.contarNaoLidas().subscribe(resolve);
    });

    const req = httpMock.expectOne(`${base}/nao-lidas/contagem`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush({ naoLidas: 2 });

    expect(await resposta).toEqual({ naoLidas: 2 });
  });

  it('marcarComoLida: POST /notificacoes/{id}/leitura sem corpo e sem Idempotency-Key', async () => {
    const lida = { ...item, lidaEm: '2026-09-14T11:00:00-03:00' };
    const resposta = new Promise<NotificacaoResponse>((resolve) => {
      service.marcarComoLida(ID).subscribe(resolve);
    });

    const req = httpMock.expectOne(`${base}/${ID}/leitura`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    expect(req.request.headers.has('Idempotency-Key')).toBe(false);
    req.flush(lida);

    expect(await resposta).toEqual(lida);
  });

  it('marcarComoLida: propaga o 404 neutro pelo canal de erro', async () => {
    const erro = new Promise<{ status: number }>((resolve) => {
      service.marcarComoLida(ID).subscribe({ error: resolve });
    });

    httpMock
      .expectOne(`${base}/${ID}/leitura`)
      .flush(
        { message: 'Notificacao nao encontrada', codigo: 'NTF-404-001' },
        { status: 404, statusText: 'Not Found' },
      );

    expect((await erro).status).toBe(404);
  });
});
