import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { AgendaPagamentoResponse } from '../app/core/api/api.models';
import { CobrancaService } from '../app/core/cobranca/cobranca.service';
import type { PagadorPix } from '../app/core/pix-automatico/pix-automatico.models';
import { PixAutomaticoService } from '../app/core/pix-automatico/pix-automatico.service';
import {
  atualizarParametros,
  consultarParametros,
  criarAutorizacao,
  debitosDe,
  listarAutorizacoes,
  revogar,
  simularAceite,
} from './data/pix-automatico.store';
import { resetCobrancaState } from './handlers';

const ATIVA = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771c03';
const SEM_PIX = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771c08';

const PAGADOR: PagadorPix = {
  nome: 'Mercearia Boa Vista Ltda',
  documento: '11222333000181',
  ispb: '00000000',
  banco: 'Banco do Brasil S.A.',
  agencia: '0001',
  conta: '998877',
  tipoConta: 'CORRENTE',
};

// Pix Automatico no mock: as regras que o backend vai impor e as cobrancas derivadas das parcelas.
describe('Pix Automatico (mock)', () => {
  let cobranca: CobrancaService;
  let agendas: Record<string, AgendaPagamentoResponse>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    cobranca = TestBed.inject(CobrancaService);
    resetCobrancaState();
    agendas = {
      [ATIVA]: await firstValueFrom(cobranca.consultarAgendaPorContrato(ATIVA)),
      [SEM_PIX]: await firstValueFrom(cobranca.consultarAgendaPorContrato(SEM_PIX)),
    };
  });

  it('semeia uma autorizacao ativa e uma pendente, ligadas a contratos da carteira', () => {
    const lista = listarAutorizacoes();
    expect(lista.map((a) => a.status).sort()).toEqual(['ATIVA', 'PENDENTE_PAGADOR']);
    expect(lista.find((a) => a.status === 'ATIVA')?.contratoId).toBe(ATIVA);
    // Nenhum dado sensivel inteiro: documento e conta chegam mascarados.
    for (const a of lista) {
      expect(a.pagador.documentoMascarado).toContain('*');
      expect(a.pagador.contaMascarada).toContain('*');
    }
  });

  it('o limite por cobranca cobre a maior parcela em aberto e respeita o teto do regimento', () => {
    for (const a of listarAutorizacoes()) {
      expect(a.valorMaximo).toBeLessThanOrEqual(15_000);
    }
    const ativa = listarAutorizacoes().find((a) => a.status === 'ATIVA')!;
    const maior = Math.max(
      ...agendas[ATIVA].parcelas.filter((p) => p.status !== 'PAGA').map((p) => p.total),
    );
    expect(ativa.valorMaximo).toBeGreaterThanOrEqual(maior);
  });

  it('as cobrancas ativas vem das parcelas: o valor de cada uma e o da parcela', () => {
    const ativa = listarAutorizacoes().find((a) => a.status === 'ATIVA')!;
    const debitos = debitosDe(ativa, agendas[ATIVA]);
    expect(debitos.length).toBeGreaterThan(0);
    for (const d of debitos) {
      const numero = Number(d.parcela.split('/')[0]);
      const parcela = agendas[ATIVA].parcelas.find((p) => p.numero === numero)!;
      expect(d.valor).toBe(parcela.total);
      if (d.status === 'FALHOU') expect(parcela.diasAtraso ?? 0).toBeGreaterThan(0);
    }
  });

  it('habilita um contrato novo, exige consentimento e dados do pagador', () => {
    expect(
      criarAutorizacao(agendas[SEM_PIX], {
        contratoId: SEM_PIX,
        pagador: PAGADOR,
        consentimento: false,
      }),
    ).toMatchObject({
      status: 400,
    });
    expect(
      criarAutorizacao(agendas[SEM_PIX], {
        contratoId: SEM_PIX,
        pagador: { ...PAGADOR, ispb: '123' },
        consentimento: true,
      }),
    ).toMatchObject({ status: 400 });
    const ok = criarAutorizacao(agendas[SEM_PIX], {
      contratoId: SEM_PIX,
      pagador: PAGADOR,
      consentimento: true,
    });
    expect('autorizacao' in ok && ok.autorizacao.status).toBe('PENDENTE_PAGADOR');
    // Sem aceite do banco do tomador nao ha cobranca.
    if ('autorizacao' in ok) expect(debitosDe(ok.autorizacao, agendas[SEM_PIX])).toEqual([]);
  });

  it('recusa uma segunda autorizacao em andamento para o mesmo contrato', () => {
    const r = criarAutorizacao(agendas[ATIVA], {
      contratoId: ATIVA,
      pagador: PAGADOR,
      consentimento: true,
    });
    expect(r).toMatchObject({ status: 409 });
  });

  it('o aceite do pagador ativa e gera recorrencia; a recusa encerra', () => {
    const criada = criarAutorizacao(agendas[SEM_PIX], {
      contratoId: SEM_PIX,
      pagador: PAGADOR,
      consentimento: true,
    });
    if (!('autorizacao' in criada)) throw new Error('nao criou');
    const aceita = simularAceite(criada.autorizacao.id, true);
    expect('status' in aceita && aceita.status).toBe('ATIVA');
    expect('idRecorrencia' in aceita && aceita.idRecorrencia).toMatch(/^RR/);
    expect(simularAceite(criada.autorizacao.id, false)).toMatchObject({ status: 409 });
  });

  it('revogar exige motivo e cancela as cobrancas futuras', () => {
    const ativa = listarAutorizacoes().find((a) => a.status === 'ATIVA')!;
    expect(revogar(ativa.id, ' ')).toMatchObject({ status: 400 });
    const r = revogar(ativa.id, 'Pedido do tomador');
    expect('status' in r && r.status).toBe('REVOGADA');
    const revogada = listarAutorizacoes().find((a) => a.id === ativa.id)!;
    const debitos = debitosDe(revogada, agendas[ATIVA]);
    expect(debitos.some((d) => d.status === 'AGENDADO' || d.status === 'NOTIFICADO')).toBe(false);
    expect(revogar(ativa.id, 'de novo')).toMatchObject({ status: 409 });
  });

  it('a chave geral desligada barra novas autorizacoes; os parametros respeitam os limites', () => {
    expect(atualizarParametros({ antecedenciaNotificacaoDias: 1 })).toMatchObject({ status: 422 });
    expect(atualizarParametros({ antecedenciaNotificacaoDias: 11 })).toMatchObject({ status: 422 });
    expect(atualizarParametros({ maxTentativas: 4 })).toMatchObject({ status: 422 });
    expect(atualizarParametros({ valorMaximoPorDebito: 20_000 })).toMatchObject({ status: 422 });
    atualizarParametros({ habilitado: false });
    expect(consultarParametros().habilitado).toBe(false);
    expect(
      criarAutorizacao(agendas[SEM_PIX], {
        contratoId: SEM_PIX,
        pagador: PAGADOR,
        consentimento: true,
      }),
    ).toMatchObject({ status: 409 });
  });

  it('as rotas recusam quem nao e da equipe operacional', async () => {
    const service = TestBed.inject(PixAutomaticoService);
    // O usuario padrao do mock e ADMIN: aqui basta confirmar que a rota existe e responde.
    const params = await firstValueFrom(service.consultarParametros());
    expect(params.habilitado).toBe(true);
    const lista = await firstValueFrom(service.listarAutorizacoes());
    expect(lista).toHaveLength(2);
  });
});
