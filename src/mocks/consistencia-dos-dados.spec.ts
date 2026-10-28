import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { AgendaPagamentoResponse } from '../app/core/api/api.models';
import { CobrancaService } from '../app/core/cobranca/cobranca.service';
import { CreditoService } from '../app/core/credito/credito.service';
import { centavos, lerTaxaMensal, parcelaPrice } from '../app/core/financeiro/calculo-financeiro';
import { TAXA_MENSAL_PADRAO, TARIFA_ORIGINACAO_PCT } from '../app/core/financeiro/politica-credito';
import {
  ID_CORRESPONDENTE_CARLA,
  ID_CORRESPONDENTE_MARCOS,
  ID_CORRESPONDENTE_RAFAEL,
  listarOperacoesDe,
} from './data/correspondentes.store';
import { comissoesDe, lancamentosDe, listarProspectsDe } from './data/correspondentes-gestao.store';
import { resetCobrancaState } from './handlers';

// Os dados de demonstracao tem de fechar entre si, como fechariam num sistema real: o que uma tela soma e o
// que outra mostra. Este teste e a rede de seguranca da auditoria de dados historicos: se alguem digitar de
// novo uma parcela sem juros, um contrato acima do teto ou uma comissao que nao e base x percentual, ele cai.

const TETO_REGIMENTO = 15_000;
const CONTRATOS_DA_CARTEIRA = [
  '6f0799c0-98b9-6d9d-bc4a-7d6f5b771c03',
  '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e03',
  '6f0799c0-98b9-6d9d-bc4a-7d6f5b771c06',
  '6f0799c0-98b9-6d9d-bc4a-7d6f5b771c08',
];
const CORRESPONDENTES = [
  ID_CORRESPONDENTE_CARLA,
  ID_CORRESPONDENTE_RAFAEL,
  ID_CORRESPONDENTE_MARCOS,
];

describe('consistencia dos dados de demonstracao', () => {
  let cobranca: CobrancaService;
  let credito: CreditoService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    cobranca = TestBed.inject(CobrancaService);
    credito = TestBed.inject(CreditoService);
    resetCobrancaState();
  });

  describe('carteira de Cobranca', () => {
    async function agendas(): Promise<AgendaPagamentoResponse[]> {
      return Promise.all(
        CONTRATOS_DA_CARTEIRA.map((id) => firstValueFrom(cobranca.consultarAgendaPorContrato(id))),
      );
    }

    it('cada agenda fecha: principal soma o contratado, total soma o valor a pagar, juros na taxa padrao', async () => {
      for (const a of await agendas()) {
        const contratado = a.valorContratado as number;
        const principal = centavos(a.parcelas.reduce((s, p) => s + p.principal, 0));
        const total = centavos(a.parcelas.reduce((s, p) => s + p.total, 0));
        expect(principal, `${a.contratoCurto}: principal`).toBe(contratado);
        expect(total, `${a.contratoCurto}: total a pagar`).toBe(a.valorTotal);
        expect(a.parcelas, `${a.contratoCurto}: parcelas`).toHaveLength(a.numeroParcelas);
        for (const p of a.parcelas) expect(p.total).toBe(centavos(p.principal + p.juros));
        // A primeira parcela cobra o juro cheio do saldo; a ultima zera a divida.
        expect(a.parcelas[0].juros).toBe(centavos(contratado * TAXA_MENSAL_PADRAO));
        expect(a.valorTotal).toBeGreaterThan(contratado);
      }
    });

    it('nenhum contrato passa do teto do regimento e o liberado e o contratado menos a tarifa', async () => {
      for (const a of await agendas()) {
        expect(a.valorContratado as number).toBeLessThanOrEqual(TETO_REGIMENTO);
        expect(a.valorLiberado).toBe(
          centavos((a.valorContratado as number) * (1 - TARIFA_ORIGINACAO_PCT)),
        );
      }
    });

    it('a inadimplencia e um recorte das mesmas parcelas: soma o que as agendas tem em atraso', async () => {
      const emAtraso = (await agendas())
        .flatMap((a) => a.parcelas)
        .filter((p) => (p.diasAtraso ?? 0) > 0);
      const lista = await firstValueFrom(cobranca.listarInadimplencia());
      expect(lista).toHaveLength(emAtraso.length);
      expect(centavos(lista.reduce((s, l) => s + l.valorOriginal, 0))).toBe(
        centavos(emAtraso.reduce((s, p) => s + p.total, 0)),
      );
    });

    it('os recebimentos registrados somam as parcelas pagas das agendas', async () => {
      const pagas = (await agendas()).flatMap((a) => a.parcelas).filter((p) => p.status === 'PAGA');
      const recebimentos = await firstValueFrom(cobranca.listarRecebimentos());
      const recebido = centavos(recebimentos.reduce((s, r) => s + r.valorRecebido, 0));
      expect(recebido).toBe(centavos(pagas.reduce((s, p) => s + p.total, 0)));
    });
  });

  describe('propostas de credito', () => {
    it('a parcela estimada e a da tabela Price na taxa que a propria proposta anuncia', async () => {
      const pagina = await firstValueFrom(credito.listarPropostas({ size: 100 }));
      expect(pagina.content.length).toBeGreaterThan(0);
      for (const p of pagina.content) {
        const taxa = lerTaxaMensal(p.taxaEstimada) as number;
        expect(taxa, `${p.id}: taxa anunciada`).toBeCloseTo(TAXA_MENSAL_PADRAO, 6);
        expect(p.valorParcelaEstimado, p.id).toBe(
          parcelaPrice(p.valorSolicitado, taxa, p.prazoMeses),
        );
        expect(p.valorSolicitado).toBeLessThanOrEqual(TETO_REGIMENTO);
      }
    });
  });

  describe('Correspondentes', () => {
    it('contratos e propostas respeitam o teto, e a parcela vem da tabela Price', () => {
      for (const id of CORRESPONDENTES) {
        for (const o of listarOperacoesDe(id)) {
          expect(o.valorContratado, o.numero).toBeLessThanOrEqual(TETO_REGIMENTO);
          if (o.tipo === 'CONTRATO') {
            expect(o.valorParcela, o.numero).toBe(
              parcelaPrice(o.valorContratado, TAXA_MENSAL_PADRAO, o.totalParcelas),
            );
            // As parcelas somam o que se paga: pago + em aberto = total do plano.
            const total = centavos(o.parcelas.reduce((s, p) => s + p.valor, 0));
            expect(centavos(o.valorPago + o.saldoAReceber), o.numero).toBe(total);
            expect(total, o.numero).toBeGreaterThan(o.valorContratado);
          }
        }
      }
    });

    it('o funil nao tem prospect acima do teto de uma operacao', () => {
      for (const id of CORRESPONDENTES) {
        for (const p of listarProspectsDe(id))
          expect(p.valorEstimado, p.nome).toBeLessThanOrEqual(TETO_REGIMENTO);
      }
    });

    it('cada comissao e base x percentual, e os totais por situacao fecham com o resumo', () => {
      for (const id of CORRESPONDENTES) {
        const lancamentos = lancamentosDe(id);
        for (const l of lancamentos) {
          expect(l.valor, `${l.contratoNumero} ${l.evento}`).toBe(
            Math.round(l.baseCalculo * l.percentual) / 100,
          );
        }
        const resumo = comissoesDe(id);
        const soma = (status: string) =>
          centavos(lancamentos.filter((l) => l.status === status).reduce((s, l) => s + l.valor, 0));
        expect(resumo.paga).toBe(soma('PAGA'));
        expect(resumo.prevista).toBe(soma('PREVISTA'));
        expect(resumo.disponivel).toBe(soma('DISPONIVEL'));
      }
    });
  });
});
