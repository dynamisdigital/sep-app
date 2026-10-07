import { describe, expect, it } from 'vitest';

import { AgendaPagamentoResponse, ParcelaResponse } from '../../../../core/api/api.models';
import {
  alertasDaCarteira,
  caminhosDoGrafico,
  contratoDaAgenda,
  linhasDaAgenda,
  recebimentosDaJanela,
} from './cobranca-carteira';

function parcela(
  numero: number,
  vencimento: string,
  total: number,
  status: ParcelaResponse['status'],
  dias = 0,
  pago: string | null = null,
): ParcelaResponse {
  return {
    id: `p${numero}`,
    numero,
    principal: total - 10,
    juros: 10,
    multa: 0,
    encargos: 0,
    total,
    dataVencimento: vencimento,
    status,
    diasAtraso: dias,
    dataPagamento: pago,
  };
}

const AGENDA = {
  id: 'a1',
  contratoId: 'c1',
  numeroParcelas: 4,
  valorTotal: 400,
  dataGeracao: '2026-01-01',
  produto: 'CAPITAL_GIRO',
  valorContratado: 360,
  parcelas: [
    parcela(1, '2026-04-10', 100, 'PAGA', 0, '2026-04-10'),
    parcela(2, '2026-05-05', 100, 'INADIMPLENTE', 25),
    parcela(3, '2026-06-10', 100, 'PENDENTE'),
    parcela(4, '2026-08-10', 100, 'PENDENTE'),
  ],
} as AgendaPagamentoResponse;

describe('cobranca-carteira', () => {
  it('o contrato sai da agenda: o em aberto soma os totais com juros e o atraso marca o contrato', () => {
    const c = contratoDaAgenda(AGENDA, '5b771c99', 'uuid');
    expect(c).toMatchObject({
      id: '5b771c99',
      operation: 'CAPITAL_GIRO',
      contracted: 360,
      open: 300,
      status: 'ATRASADO',
    });
  });

  it('as linhas separam pendente (ate 30 dias) de agendada e carregam o dia do pagamento', () => {
    const linhas = linhasDaAgenda(AGENDA, '5b771c99', '2026-05-30');
    expect(linhas.map((l) => l.status)).toEqual(['PAGA', 'ATRASADA', 'PENDENTE', 'AGENDADA']);
    expect(linhas[1].overdueDays).toBe(25);
    expect(linhas[0].paidIso).toBe('2026-04-10');
    expect(linhas[0].number).toBe('1/4');
    expect(linhas[0].dueDate).toBe('10/04/2026');
  });

  it('os alertas citam parcelas que existem: as mais atrasadas e o proximo vencimento, com o valor', () => {
    const linhas = linhasDaAgenda(AGENDA, '5b771c99', '2026-05-30');
    const alertas = alertasDaCarteira(linhas, '2026-05-30');
    expect(alertas.map((a) => a.titulo)).toEqual([
      'Parcela 2/4 em atraso',
      'Vencimento em 11 dias',
    ]);
    expect(alertas[0].tom).toBe('red');
    expect(alertas[1]).toMatchObject({
      tom: 'blue',
      detalhe: 'Parcela 3/4 - Contrato 5b771c99',
      valor: 100,
    });
  });

  it('recebimentos de 30 dias comparam com os 30 anteriores e acumulam dia a dia', () => {
    const linhas = linhasDaAgenda(AGENDA, '5b771c99', '2026-05-30');
    // Ref. 30/05: janela 01/05 a 30/05 (sem pagamento) e anterior 01/04 a 30/04 (a parcela 1, R$ 100).
    const janela = recebimentosDaJanela(linhas, '2026-05-30', 30);
    expect(janela.total).toBe(0);
    expect(janela.anterior).toBe(100);
    expect(janela.variacaoPct).toBe(-100);
    expect(janela.acumulado).toHaveLength(30);
    expect(janela.inicio).toBe('2026-05-01');
    const dentro = recebimentosDaJanela(linhas, '2026-04-30', 30);
    expect(dentro.total).toBe(100);
    expect(dentro.variacaoPct).toBeNull();
    expect(dentro.acumulado[dentro.acumulado.length - 1]).toBe(100);
  });

  it('o grafico nao quebra sem dado: serie zerada vira linha na base', () => {
    const vazio = caminhosDoGrafico([0, 0, 0]);
    expect(vazio.maximo).toBe(0);
    expect(vazio.linha.startsWith('M0 93')).toBe(true);
    const cheio = caminhosDoGrafico([0, 50, 100]);
    expect(cheio.linha).toBe('M0 94 160 50 320 6');
    expect(cheio.area.endsWith('V94H0Z')).toBe(true);
  });
});
