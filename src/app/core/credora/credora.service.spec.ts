import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CadastrarCredoraRequest } from '../api/api.models';
import { CredoraService } from './credora.service';

// Contrato HTTP exato (URL, metodo, body, headers, status). O CredoraService e transporte puro:
// nao transforma payload, nao calcula elegibilidade, nao anexa step-up. Os fluxos de regra de
// negocio (ownership, elegibilidade, unicidade de interesse) sao exercitados via MSW nas specs de
// componente das Tasks seguintes.
describe('CredoraService (contrato HTTP)', () => {
  let service: CredoraService;
  let httpMock: HttpTestingController;
  const base = 'http://localhost:8080/api/v1';
  const OPORTUNIDADE_ID = '7f0799c0-98b9-6d9d-bc4a-7d6f5b78b001';
  const OPERACAO_ID = '7f0799c0-98b9-6d9d-bc4a-7d6f5b78c001';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CredoraService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('cadastrarCredora: POST /credores com o body e sem X-Step-Up-Token', () => {
    const request: CadastrarCredoraRequest = {
      onboardingId: '7f0799c0-98b9-6d9d-bc4a-7d6f5b78a001',
      tipoCredora: 'EMPRESA',
      capacidadeAporte: 500000,
    };
    service.cadastrarCredora(request).subscribe();

    const req = httpMock.expectOne(`${base}/credores`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    expect(req.request.headers.has('X-Step-Up-Token')).toBe(false);
    req.flush({});
  });

  it('consultarMinhaCredora: GET /credores/me', () => {
    service.consultarMinhaCredora().subscribe();

    const req = httpMock.expectOne(`${base}/credores/me`);
    expect(req.request.method).toBe('GET');
    expect(req.request.body).toBeNull();
    req.flush({});
  });

  it('consultarMinhaCredora: propaga o 404 (sem credora) pelo canal de erro com status 404', async () => {
    const erro = new Promise<{ status: number }>((resolve) => {
      service.consultarMinhaCredora().subscribe({ error: resolve });
    });

    const req = httpMock.expectOne(`${base}/credores/me`);
    req.flush({ message: 'Usuario nao possui credora' }, { status: 404, statusText: 'Not Found' });

    expect((await erro).status).toBe(404);
  });

  it('consultarElegibilidade: GET /credores/me/elegibilidade', () => {
    service.consultarElegibilidade().subscribe();

    const req = httpMock.expectOne(`${base}/credores/me/elegibilidade`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('listarOportunidades: GET /credores/oportunidades', () => {
    service.listarOportunidades().subscribe();

    const req = httpMock.expectOne(`${base}/credores/oportunidades`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('consultarOportunidade: GET /credores/oportunidades/{id}', () => {
    service.consultarOportunidade(OPORTUNIDADE_ID).subscribe();

    const req = httpMock.expectOne(`${base}/credores/oportunidades/${OPORTUNIDADE_ID}`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('registrarInteresse: POST /oportunidades/{id}/interesses com body nulo e sem step-up', () => {
    service.registrarInteresse(OPORTUNIDADE_ID).subscribe();

    const req = httpMock.expectOne(`${base}/credores/oportunidades/${OPORTUNIDADE_ID}/interesses`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    expect(req.request.headers.has('X-Step-Up-Token')).toBe(false);
    req.flush({}, { status: 201, statusText: 'Created' });
  });

  it('cancelarInteresse: DELETE /oportunidades/{id}/interesses/me retornando 204', () => {
    service.cancelarInteresse(OPORTUNIDADE_ID).subscribe();

    const req = httpMock.expectOne(
      `${base}/credores/oportunidades/${OPORTUNIDADE_ID}/interesses/me`,
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  // O backend real (CancelarInteresseCredoraUseCase) NAO e idempotente: sem interesse ATIVO ele
  // responde 404. O service propaga esse 404 para o componente decidir a UX; nao o mascara.
  it('cancelarInteresse: propaga o 404 quando nao ha interesse ativo', async () => {
    const erro = new Promise<{ status: number }>((resolve) => {
      service.cancelarInteresse(OPORTUNIDADE_ID).subscribe({ error: resolve });
    });

    const req = httpMock.expectOne(
      `${base}/credores/oportunidades/${OPORTUNIDADE_ID}/interesses/me`,
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(
      { message: 'Interesse ativo nao encontrado' },
      { status: 404, statusText: 'Not Found' },
    );

    expect((await erro).status).toBe(404);
  });

  it('listarCarteira: GET /credores/carteira', () => {
    service.listarCarteira().subscribe();

    const req = httpMock.expectOne(`${base}/credores/carteira`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('consultarOperacaoCarteira: GET /credores/carteira/{id}', () => {
    service.consultarOperacaoCarteira(OPERACAO_ID).subscribe();

    const req = httpMock.expectOne(`${base}/credores/carteira/${OPERACAO_ID}`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });
});
