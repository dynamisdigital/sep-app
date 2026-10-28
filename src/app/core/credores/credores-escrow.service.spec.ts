import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CredoresEscrowService } from './credores-escrow.service';

// Contrato HTTP exato (URL, metodo, body, headers). O service e transporte puro: saldo, limite por
// devedor, rateio e prazos sao do backend. As regras do mock estao em escrow-ledger.spec.ts e
// credores-escrow.store.spec.ts.
describe('CredoresEscrowService (contrato HTTP)', () => {
  let service: CredoresEscrowService;
  let httpMock: HttpTestingController;
  const base = 'http://localhost:8080/api/v1';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CredoresEscrowService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('consultarConta e listarExtrato: GET sob /credores/me/escrow', () => {
    service.consultarConta().subscribe();
    const conta = httpMock.expectOne(`${base}/credores/me/escrow`);
    expect(conta.request.method).toBe('GET');
    conta.flush({});

    service.listarExtrato().subscribe();
    const extrato = httpMock.expectOne(`${base}/credores/me/escrow/extrato`);
    expect(extrato.request.method).toBe('GET');
    extrato.flush([]);
  });

  it('criarAporte: POST com o valor e a Idempotency-Key', () => {
    service.criarAporte(5000, 'chave-aporte').subscribe();

    const req = httpMock.expectOne(`${base}/credores/me/escrow/aportes`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ valor: 5000 });
    expect(req.request.headers.get('Idempotency-Key')).toBe('chave-aporte');
    req.flush({});
  });

  it('alocar: POST com ciência de risco e Idempotency-Key', () => {
    const pedido = { oportunidadeId: 'op-1', valor: 2000, cienciaRisco: true };
    service.alocar(pedido, 'chave-aloc').subscribe();

    const req = httpMock.expectOne(`${base}/credores/me/alocacoes`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(pedido);
    expect(req.request.headers.get('Idempotency-Key')).toBe('chave-aloc');
    req.flush({});
  });

  it('cancelarAlocacao e consultarLimite: DELETE e GET sob /credores/me', () => {
    service.cancelarAlocacao('al-1').subscribe();
    const cancelar = httpMock.expectOne(`${base}/credores/me/alocacoes/al-1`);
    expect(cancelar.request.method).toBe('DELETE');
    cancelar.flush(null);

    service.consultarLimite('op-1').subscribe();
    const limite = httpMock.expectOne(`${base}/credores/me/limites/op-1`);
    expect(limite.request.method).toBe('GET');
    limite.flush({});
  });

  it('listarOportunidadesAlocaveis: GET /credores/me/oportunidades', () => {
    service.listarOportunidadesAlocaveis().subscribe();

    const req = httpMock.expectOne(`${base}/credores/me/oportunidades`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('solicitarSaque: POST com destinatário, valor e Idempotency-Key', () => {
    service.solicitarSaque({ destinatarioId: 'd-1', valor: 300 }, 'chave-saque').subscribe();

    const req = httpMock.expectOne(`${base}/credores/me/saques`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ destinatarioId: 'd-1', valor: 300 });
    expect(req.request.headers.get('Idempotency-Key')).toBe('chave-saque');
    req.flush({});
  });

  it('criarDestinatario: POST sem Idempotency-Key e sem step-up no service', () => {
    const pedido = {
      banco: 'Nubank (260)',
      agencia: '0001',
      conta: '123456-7',
      tipoConta: 'PAGAMENTO' as const,
    };
    service.criarDestinatario(pedido).subscribe();

    const req = httpMock.expectOne(`${base}/credores/me/destinatarios`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(pedido);
    expect(req.request.headers.has('Idempotency-Key')).toBe(false);
    expect(req.request.headers.has('X-Step-Up-Token')).toBe(false);
    req.flush({});
  });

  it('listarCredores: GET /backoffice/credores com e sem filtro de status', () => {
    service.listarCredores().subscribe();
    const todos = httpMock.expectOne(`${base}/backoffice/credores`);
    expect(todos.request.params.has('status')).toBe(false);
    todos.flush([]);

    service.listarCredores('EM_ANALISE').subscribe();
    const filtrados = httpMock.expectOne(
      (r) => r.url === `${base}/backoffice/credores` && r.params.get('status') === 'EM_ANALISE',
    );
    expect(filtrados.request.method).toBe('GET');
    filtrados.flush([]);
  });

  it('alterarStatus: PATCH /backoffice/credores/{id}/status com status e motivo', () => {
    service.alterarStatus('c-1', { status: 'SUSPENSO', motivo: 'Suspeita de fraude' }).subscribe();

    const req = httpMock.expectOne(`${base}/backoffice/credores/c-1/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'SUSPENSO', motivo: 'Suspeita de fraude' });
    req.flush({});
  });

  it('alterarPerfilRisco e alterarCategoria: PATCH com o campo correspondente', () => {
    service.alterarPerfilRisco('c-1', 'MODERADO').subscribe();
    const perfil = httpMock.expectOne(`${base}/backoffice/credores/c-1/perfil-risco`);
    expect(perfil.request.method).toBe('PATCH');
    expect(perfil.request.body).toEqual({ perfilRisco: 'MODERADO' });
    perfil.flush({});

    service.alterarCategoria('c-1', 'QUALIFICADO').subscribe();
    const categoria = httpMock.expectOne(`${base}/backoffice/credores/c-1/categoria`);
    expect(categoria.request.method).toBe('PATCH');
    expect(categoria.request.body).toEqual({ categoria: 'QUALIFICADO' });
    categoria.flush({});
  });

  it('aprovarSaque: POST sem corpo e com Idempotency-Key; rejeitar não leva a chave', () => {
    service.aprovarSaque('s-1', 'chave-aprova').subscribe();
    const aprovar = httpMock.expectOne(`${base}/backoffice/tesouraria/saques/s-1/aprovar`);
    expect(aprovar.request.method).toBe('POST');
    expect(aprovar.request.body).toBeNull();
    expect(aprovar.request.headers.get('Idempotency-Key')).toBe('chave-aprova');
    aprovar.flush({});

    service.rejeitarSaque('s-2').subscribe();
    const rejeitar = httpMock.expectOne(`${base}/backoffice/tesouraria/saques/s-2/rejeitar`);
    expect(rejeitar.request.method).toBe('POST');
    expect(rejeitar.request.headers.has('Idempotency-Key')).toBe(false);
    rejeitar.flush({});
  });

  it('listarOportunidadesTesouraria e listarOperacoes: GET sob /backoffice/tesouraria', () => {
    service.listarOportunidadesTesouraria().subscribe();
    const oportunidades = httpMock.expectOne(`${base}/backoffice/tesouraria/oportunidades`);
    expect(oportunidades.request.method).toBe('GET');
    oportunidades.flush([]);

    service.listarOperacoes().subscribe();
    const operacoes = httpMock.expectOne(`${base}/backoffice/tesouraria/operacoes`);
    expect(operacoes.request.method).toBe('GET');
    operacoes.flush([]);
  });

  it('desembolsar, encerrarSemFormar e repassarParcela: rotas da tesouraria', () => {
    service.desembolsar('op-1', 'operacao-9', 'chave-d').subscribe();
    const desembolso = httpMock.expectOne(
      `${base}/backoffice/tesouraria/oportunidades/op-1/desembolsar`,
    );
    expect(desembolso.request.body).toEqual({ operacaoId: 'operacao-9' });
    expect(desembolso.request.headers.get('Idempotency-Key')).toBe('chave-d');
    desembolso.flush({});

    service.encerrarSemFormar('op-1', 'Tomador desistiu').subscribe();
    const encerrar = httpMock.expectOne(
      `${base}/backoffice/tesouraria/oportunidades/op-1/encerrar`,
    );
    expect(encerrar.request.body).toEqual({ motivo: 'Tomador desistiu' });
    encerrar.flush({});

    service
      .repassarParcela('operacao-9', 3, { principal: 462.5, juros: 87.88 }, 'chave-r')
      .subscribe();
    const repasse = httpMock.expectOne(
      `${base}/backoffice/tesouraria/operacoes/operacao-9/parcelas/3/repasse`,
    );
    expect(repasse.request.body).toEqual({ principal: 462.5, juros: 87.88 });
    expect(repasse.request.headers.get('Idempotency-Key')).toBe('chave-r');
    repasse.flush({});
  });
});
