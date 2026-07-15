import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { CobrancaService } from './cobranca.service';
import { RegistrarRecebimentoRequest } from '../api/api.models';
import { StepUpTokenStore } from '../auth/step-up-token.store';
import { stepUpInterceptor } from '../interceptors/step-up.interceptor';

function awaitObservable<T>(obs: Observable<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    obs.subscribe({ next: resolve, error: reject });
  });
}

// Sentinelas espelhando os handlers MSW de cobranca (src/mocks/handlers.ts).
const CONTRATO_COM_AGENDA_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e03';
const CONTRATO_SEM_OWNERSHIP_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771ff03';
const CONTRATO_INEXISTENTE_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771dead';
const PARCELA_PENDENTE_ID = 'a0000000-0000-4000-8000-000000000001';
const PARCELA_ATRASADA_ID = 'a0000000-0000-4000-8000-000000000002';
const PARCELA_PAGA_ID = 'a0000000-0000-4000-8000-000000000004';
const PARCELA_PARA_RECEBIMENTO_ID = 'a0000000-0000-4000-8000-000000000006';
const PARCELA_RENEG_ATIVA_ID = 'a0000000-0000-4000-8000-000000000007';
const PARCELA_SEM_OWNERSHIP_ID = 'a0000000-0000-4000-8000-0000000000ff';
const PARCELA_INEXISTENTE_ID = 'a0000000-0000-4000-8000-0000000000aa';
const RENEG_PARA_ACEITE_ID = 'b0000000-0000-4000-8000-000000000001';
const RENEG_PARA_RECUSA_ID = 'b0000000-0000-4000-8000-000000000002';
const RENEG_TOMADOR_ATIVA_ID = 'b0000000-0000-4000-8000-000000000004';

const RECEBIMENTO_VALIDO: RegistrarRecebimentoRequest = {
  valorRecebido: 1000.0,
  dataRecebimento: '2026-06-05T10:00:00-03:00',
  meioPagamento: 'TRANSFERENCIA',
  identificadorExterno: 'comp-2026-06-05-001',
  observacao: 'Recebido via TED',
};

describe('CobrancaService', () => {
  let service: CobrancaService;
  let stepUpStore: StepUpTokenStore;

  beforeEach(() => {
    // stepUpInterceptor real na cadeia HTTP (recorte do app.config.ts): as specs tambem
    // provam que o token de step-up so e anexado/consumido na allowlist, nunca nos GETs.
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([stepUpInterceptor]))],
    });
    service = TestBed.inject(CobrancaService);
    stepUpStore = TestBed.inject(StepUpTokenStore);
  });

  describe('consultarAgendaPorContrato', () => {
    it('retorna a agenda do contrato com parcelas e composicao estatica', async () => {
      const agenda = await awaitObservable(
        service.consultarAgendaPorContrato(CONTRATO_COM_AGENDA_ID),
      );

      expect(agenda.contratoId).toBe(CONTRATO_COM_AGENDA_ID);
      expect(agenda.parcelas.map((p) => p.status)).toEqual([
        'PENDENTE',
        'ATRASADA',
        'PARCIALMENTE_PAGA',
        'PAGA',
      ]);
      expect(agenda.parcelas[0].total).toBe(1000);
    });

    it('rejeita com 403 quando a agenda e de outro tomador', async () => {
      await expect(
        awaitObservable(service.consultarAgendaPorContrato(CONTRATO_SEM_OWNERSHIP_ID)),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('rejeita com 404 quando a agenda nao existe', async () => {
      await expect(
        awaitObservable(service.consultarAgendaPorContrato(CONTRATO_INEXISTENTE_ID)),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('consultarParcela', () => {
    it('retorna o valor atualizado com mora/multa calculados no backend', async () => {
      const parcela = await awaitObservable(service.consultarParcela(PARCELA_ATRASADA_ID));

      expect(parcela.parcelaId).toBe(PARCELA_ATRASADA_ID);
      expect(parcela.jurosMora).toBeGreaterThan(0);
      expect(parcela.valorEmAberto).toBe(parcela.valorDevidoAtualizado - parcela.totalRecebido);
    });

    it('rejeita com 403 quando a parcela e de outro tomador', async () => {
      await expect(
        awaitObservable(service.consultarParcela(PARCELA_SEM_OWNERSHIP_ID)),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('rejeita com 404 quando a parcela nao existe', async () => {
      await expect(
        awaitObservable(service.consultarParcela(PARCELA_INEXISTENTE_ID)),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('registrarRecebimento', () => {
    it('registra recebimento novo enviando a Idempotency-Key', async () => {
      const recebimento = await awaitObservable(
        service.registrarRecebimento(PARCELA_PARA_RECEBIMENTO_ID, RECEBIMENTO_VALIDO, 'key-novo-1'),
      );

      expect(recebimento.novo).toBe(true);
      expect(recebimento.parcelaId).toBe(PARCELA_PARA_RECEBIMENTO_ID);
      expect(recebimento.movimentacaoEscrowId).toBeTruthy();
    });

    it('faz replay (novo=false) quando reapresenta a mesma key com o mesmo payload', async () => {
      await awaitObservable(
        service.registrarRecebimento(
          PARCELA_PARA_RECEBIMENTO_ID,
          RECEBIMENTO_VALIDO,
          'key-replay-1',
        ),
      );
      const replay = await awaitObservable(
        service.registrarRecebimento(
          PARCELA_PARA_RECEBIMENTO_ID,
          RECEBIMENTO_VALIDO,
          'key-replay-1',
        ),
      );

      expect(replay.novo).toBe(false);
    });

    it('rejeita com 409 quando a mesma key vem com payload divergente', async () => {
      await awaitObservable(
        service.registrarRecebimento(
          PARCELA_PARA_RECEBIMENTO_ID,
          RECEBIMENTO_VALIDO,
          'key-conflito-1',
        ),
      );
      await expect(
        awaitObservable(
          service.registrarRecebimento(
            PARCELA_PARA_RECEBIMENTO_ID,
            { ...RECEBIMENTO_VALIDO, valorRecebido: 500.0 },
            'key-conflito-1',
          ),
        ),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('rejeita com 400 quando a Idempotency-Key foge do pattern do backend', async () => {
      await expect(
        awaitObservable(
          service.registrarRecebimento(
            PARCELA_PARA_RECEBIMENTO_ID,
            RECEBIMENTO_VALIDO,
            'key invalida',
          ),
        ),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('rejeita com 404 quando a parcela nao existe', async () => {
      await expect(
        awaitObservable(
          service.registrarRecebimento(PARCELA_INEXISTENTE_ID, RECEBIMENTO_VALIDO, 'key-404'),
        ),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('rejeita com 409 quando a parcela esta em estado nao-recebivel (PAGA)', async () => {
      await expect(
        awaitObservable(
          service.registrarRecebimento(PARCELA_PAGA_ID, RECEBIMENTO_VALIDO, 'key-paga'),
        ),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('listarRecebimentos', () => {
    it('retorna a lista de recebimentos', async () => {
      const lista = await awaitObservable(service.listarRecebimentos());

      expect(Array.isArray(lista)).toBe(true);
      expect(lista.length).toBeGreaterThan(0);
    });
  });

  describe('listarInadimplencia', () => {
    it('retorna todas as linhas sem filtro', async () => {
      const linhas = await awaitObservable(service.listarInadimplencia());

      expect(linhas.map((l) => l.status)).toContain('INADIMPLENTE');
    });

    it('filtra por status enviando o query param correto', async () => {
      const linhas = await awaitObservable(service.listarInadimplencia({ status: 'ATRASADA' }));

      expect(linhas.every((l) => l.status === 'ATRASADA')).toBe(true);
    });

    it('filtra por dias de atraso minimo', async () => {
      const linhas = await awaitObservable(service.listarInadimplencia({ diasAtrasoMin: 100 }));

      expect(linhas.every((l) => l.diasAtraso >= 100)).toBe(true);
    });
  });

  describe('registrarContato', () => {
    it('registra contato manual retornando evento CONTATO_MANUAL sem canal', async () => {
      const evento = await awaitObservable(
        service.registrarContato(PARCELA_ATRASADA_ID, {
          descricao: 'Cliente confirmou pagamento ate sexta.',
          diasAtraso: 21,
        }),
      );

      expect(evento.tipo).toBe('CONTATO_MANUAL');
      expect(evento.canal).toBeNull();
      expect(evento.descricao).toContain('Cliente confirmou');
    });

    it('rejeita com 404 quando a parcela nao existe', async () => {
      await expect(
        awaitObservable(
          service.registrarContato(PARCELA_INEXISTENTE_ID, { descricao: 'Contato.' }),
        ),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('consultarRenegociacaoAtiva', () => {
    it('consulta os termos publicos da proposta ativa com exatamente os dez campos', async () => {
      const termos = await awaitObservable(
        service.consultarRenegociacaoAtiva(PARCELA_RENEG_ATIVA_ID),
      );

      // toEqual estrito: alem dos valores, prova que campos internos (tomadorId,
      // propostaPor, agendaOriginalId, justificativa...) nao chegam na borda publica.
      expect(termos).toEqual({
        renegociacaoId: RENEG_TOMADOR_ATIVA_ID,
        parcelaId: PARCELA_RENEG_ATIVA_ID,
        status: 'PROPOSTA',
        novoValorParcela: 340.0,
        numeroParcelas: 5,
        valorTotalRenegociado: 1700.0,
        novoVencimento: '2026-08-15',
        desconto: 60.0,
        dataProposta: expect.any(String),
        dataExpiracao: expect.any(String),
      });
    });

    it('nao envia nem consome o step-up token no GET mesmo com token no store', async () => {
      stepUpStore.set('step-up-tok');

      await awaitObservable(service.consultarRenegociacaoAtiva(PARCELA_RENEG_ATIVA_ID));

      expect(stepUpStore.token()).toBe('step-up-tok');
      stepUpStore.clear();
    });

    it('rejeita com 403 uniforme quando a parcela e de outro tomador', async () => {
      await expect(
        awaitObservable(service.consultarRenegociacaoAtiva(PARCELA_SEM_OWNERSHIP_ID)),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('rejeita com 403 uniforme quando a parcela nao existe (sem enumeracao via 404)', async () => {
      await expect(
        awaitObservable(service.consultarRenegociacaoAtiva(PARCELA_INEXISTENTE_ID)),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('rejeita com 404 quando a parcela propria nao tem proposta ativa', async () => {
      await expect(
        awaitObservable(service.consultarRenegociacaoAtiva(PARCELA_PENDENTE_ID)),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('iniciarRenegociacao', () => {
    // O step-up e anexado pelo stepUpInterceptor (Task F-9.5), nao pelo service. Sem o
    // header X-Step-Up-Token o backend (@RequireStepUp) responde 403 — comportamento real aqui.
    it('rejeita com 403 quando nao ha step-up', async () => {
      await expect(
        awaitObservable(
          service.iniciarRenegociacao(PARCELA_RENEG_ATIVA_ID, {
            novoValorParcela: 950.0,
            novoVencimento: '2026-07-10',
            numeroParcelas: 6,
            desconto: 50.0,
            justificativa: 'Acordo com o tomador.',
          }),
        ),
      ).rejects.toMatchObject({ status: 403 });
    });
  });

  describe('aceitarRenegociacao', () => {
    it('rejeita com 403 quando nao ha step-up', async () => {
      await expect(
        awaitObservable(service.aceitarRenegociacao(RENEG_PARA_ACEITE_ID)),
      ).rejects.toMatchObject({ status: 403 });
    });
  });

  describe('recusarRenegociacao', () => {
    it('recusa a proposta sem exigir step-up', async () => {
      const renegociacao = await awaitObservable(service.recusarRenegociacao(RENEG_PARA_RECUSA_ID));

      expect(renegociacao.status).toBe('RECUSADA');
      expect(renegociacao.dataDecisao).toBeTruthy();
    });
  });
});
