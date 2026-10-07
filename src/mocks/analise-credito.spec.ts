import { beforeEach, describe, expect, it } from 'vitest';

import { parcelaPrice } from '../app/core/financeiro/calculo-financeiro';
import { TAXA_MENSAL_PADRAO } from '../app/core/financeiro/politica-credito';
import {
  atualizarParametros,
  consultarAnalise,
  consultarParametros,
  executarAnalise,
  type PropostaParaAnalise,
  registrarParecer,
  reiniciarAnalises,
} from './data/analise-credito.store';

function proposta(
  status: string,
  valor = 1250,
  prazo = 12,
  id = `p-${status}`,
): PropostaParaAnalise {
  return {
    id,
    status,
    valorSolicitado: valor,
    prazoMeses: prazo,
    valorParcelaEstimado: parcelaPrice(valor, TAXA_MENSAL_PADRAO, prazo),
  };
}

const COM_CONSENTIMENTO = { consentimentoTitular: true };

function analisar(p: PropostaParaAnalise) {
  const r = executarAnalise(p, COM_CONSENTIMENTO);
  if ('erro' in r) throw new Error(r.erro);
  return r.analise;
}

// Motor de analise de credito (mock): consulta bureaus, pontua fatores explicaveis e sugere a decisao.
describe('analise de credito (mock)', () => {
  beforeEach(() => reiniciarAnalises());

  it('exige o consentimento do titular antes de consultar os bureaus', () => {
    expect(executarAnalise(proposta('EM_ANALISE'), { consentimentoTitular: false })).toMatchObject({
      status: 400,
    });
    expect(executarAnalise(undefined, COM_CONSENTIMENTO)).toMatchObject({ status: 404 });
  });

  it('o score e a soma das contribuicoes e os pesos somam 100', () => {
    for (const status of ['APROVADA', 'EM_ANALISE', 'PENDENCIA', 'REJEITADA']) {
      const a = analisar(proposta(status));
      expect(a.fatores.reduce((s, f) => s + f.peso, 0)).toBe(100);
      expect(a.fatores.reduce((s, f) => s + f.contribuicao, 0)).toBe(a.score);
      expect(a.score).toBeGreaterThanOrEqual(0);
      expect(a.score).toBeLessThanOrEqual(1000);
      for (const f of a.fatores) expect(f.contribuicao).toBeLessThanOrEqual(f.peso * 10);
    }
  });

  it('bom pagador: aprova na faixa alta, sem regra bloqueante', () => {
    const a = analisar(proposta('APROVADA'));
    expect(a.decisaoSugerida).toBe('APROVAR');
    expect(['A', 'B']).toContain(a.faixa);
    expect(a.regras.filter((r) => r.bloqueante)).toEqual([]);
    expect(a.consultas.every((c) => c.status === 'OK')).toBe(true);
  });

  it('restricoes relevantes e atraso grave recusam por regra bloqueante', () => {
    const a = analisar(proposta('REJEITADA'));
    expect(a.decisaoSugerida).toBe('RECUSAR');
    const bloqueantes = a.regras.filter((r) => r.bloqueante).map((r) => r.regra);
    expect(bloqueantes).toContain('Restrições relevantes');
    expect(bloqueantes).toContain('Atraso grave no SCR');
    expect(a.resumo).toMatch(/regra bloqueante/);
  });

  it('bureau fora do ar nunca decide sozinho: vai para analise manual', () => {
    const a = analisar(proposta('PENDENCIA'));
    expect(a.consultas.find((c) => c.fonte === 'SCR_BACEN')?.status).toBe('INDISPONIVEL');
    expect(a.decisaoSugerida).toBe('ANALISE_MANUAL');
    expect(a.regras.some((r) => r.regra === 'Fonte indisponível')).toBe(true);
  });

  it('score entre os cortes cai em analise manual', () => {
    const a = analisar(proposta('EM_ANALISE'));
    expect(a.score).toBeLessThan(consultarParametros().corteAprovacao);
    expect(a.score).toBeGreaterThanOrEqual(consultarParametros().corteRecusa);
    expect(a.decisaoSugerida).toBe('ANALISE_MANUAL');
  });

  it('parcela acima do comprometimento maximo pede analise manual e mostra o limite que cabe', () => {
    const a = analisar(proposta('EM_ANALISE', 14_000, 5, 'grande'));
    expect(a.capacidade.comprometimentoPct).toBeGreaterThan(a.capacidade.comprometimentoMaximoPct);
    expect(a.decisaoSugerida).toBe('ANALISE_MANUAL');
    // O limite sugerido cabe de fato: a parcela dele nao passa do comprometimento maximo.
    const parcelaDoLimite = parcelaPrice(a.capacidade.limiteSugerido, TAXA_MENSAL_PADRAO, 5);
    expect(parcelaDoLimite).toBeLessThanOrEqual(
      (a.capacidade.faturamentoMensal * a.capacidade.comprometimentoMaximoPct) / 100,
    );
    expect(a.capacidade.limiteSugerido).toBeLessThanOrEqual(15_000);
  });

  it('acima do teto do regimento recusa', () => {
    const a = analisar(proposta('APROVADA', 20_000, 24, 'acima'));
    expect(a.decisaoSugerida).toBe('RECUSAR');
    expect(a.regras.some((r) => r.regra === 'Teto do regimento' && r.bloqueante)).toBe(true);
  });

  it('reaproveita a consulta valida e so refaz quando forcado', () => {
    const p = proposta('APROVADA');
    const primeira = executarAnalise(p, COM_CONSENTIMENTO);
    const segunda = executarAnalise(p, COM_CONSENTIMENTO);
    expect('reaproveitada' in segunda && segunda.reaproveitada).toBe(true);
    const forcada = executarAnalise(p, { ...COM_CONSENTIMENTO, forcar: true });
    expect('reaproveitada' in forcada && forcada.reaproveitada).toBe(false);
    expect('analise' in primeira).toBe(true);
  });

  it('fonte desligada nos parametros nao e consultada; nenhuma fonte e recusado', () => {
    atualizarParametros({ bureausHabilitados: { SERASA: false } as never });
    const a = analisar(proposta('APROVADA'));
    expect(a.consultas.find((c) => c.fonte === 'SERASA')?.status).toBe('NAO_CONSULTADA');
    expect(
      atualizarParametros({
        bureausHabilitados: { SERASA: false, SPC_BOA_VISTA: false, SCR_BACEN: false },
      }),
    ).toMatchObject({ status: 422 });
  });

  it('os parametros respeitam os limites', () => {
    expect(atualizarParametros({ corteRecusa: 800 })).toMatchObject({ status: 422 });
    expect(atualizarParametros({ validadeConsultaDias: 0 })).toMatchObject({ status: 422 });
    expect(atualizarParametros({ comprometimentoMaximoPct: 60 })).toMatchObject({ status: 422 });
    const ok = atualizarParametros({ corteAprovacao: 750 });
    expect('corteAprovacao' in ok && ok.corteAprovacao).toBe(750);
  });

  it('o parecer exige analise previa; divergir do motor exige justificativa detalhada', () => {
    const p = proposta('APROVADA');
    expect(
      registrarParecer(p.id, { decisao: 'APROVAR', justificativa: 'ok' }, 'ana'),
    ).toMatchObject({ status: 409 });
    analisar(p);
    expect(
      registrarParecer(p.id, { decisao: 'REJEITAR', justificativa: ' ' }, 'ana'),
    ).toMatchObject({ status: 400 });
    expect(
      registrarParecer(p.id, { decisao: 'REJEITAR', justificativa: 'curta' }, 'ana'),
    ).toMatchObject({ status: 422 });
    const ok = registrarParecer(
      p.id,
      { decisao: 'REJEITAR', justificativa: 'Cliente informou encerramento das atividades.' },
      'ana',
    );
    expect('parecer' in ok && ok.parecer?.divergeDoMotor).toBe(true);
    const acata = registrarParecer(
      p.id,
      { decisao: 'APROVAR', justificativa: 'De acordo.' },
      'ana',
    );
    expect('parecer' in acata && acata.parecer?.divergeDoMotor).toBe(false);
    expect(consultarAnalise(p.id)?.parecer?.analista).toBe('ana');
  });
});
