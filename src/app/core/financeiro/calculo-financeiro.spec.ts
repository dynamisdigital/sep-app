import { describe, expect, it } from 'vitest';

import {
  centavos,
  custoEfetivoMensal,
  gerarCronograma,
  lerTaxaMensal,
  parcelaPrice,
  resumirCronograma,
  taxaAnualEfetiva,
} from './calculo-financeiro';

describe('calculo-financeiro', () => {
  it('le a taxa em texto, com virgula ou ponto, e recusa o que nao e taxa', () => {
    expect(lerTaxaMensal('2,4% a.m.')).toBeCloseTo(0.024, 10);
    expect(lerTaxaMensal('1.99%')).toBeCloseTo(0.0199, 10);
    expect(lerTaxaMensal('2,5')).toBeCloseTo(0.025, 10);
    expect(lerTaxaMensal('sem taxa')).toBeNull();
    expect(lerTaxaMensal(null)).toBeNull();
  });

  it('parcela Price confere com valores conhecidos', () => {
    // R$ 1.250 em 12x a 2,4% a.m.: o que a proposta anunciava como 104,17 era a divisao sem juros.
    expect(parcelaPrice(1250, 0.024, 12)).toBe(121.12);
    expect(parcelaPrice(3125, 0.024, 36)).toBe(130.62);
    expect(parcelaPrice(1000, 0, 4)).toBe(250);
    expect(parcelaPrice(1000, 0.02, 0)).toBe(0);
  });

  it('o cronograma fecha: soma do principal = valor financiado e saldo final zero', () => {
    const plano = gerarCronograma({
      principal: 4625,
      taxaMensal: 0.024,
      prazoMeses: 10,
      primeiroVencimento: '2025-09-15',
    });
    expect(plano).toHaveLength(10);
    const resumo = resumirCronograma(plano);
    expect(resumo.principal).toBe(4625);
    expect(plano[plano.length - 1].saldoDevedor).toBe(0);
    // O total a pagar e principal + juros, e os juros saem do saldo de cada mes.
    expect(resumo.totalAPagar).toBe(centavos(resumo.principal + resumo.totalJuros));
    expect(plano[0].juros).toBe(centavos(4625 * 0.024));
    for (const p of plano) expect(p.total).toBe(centavos(p.principal + p.juros));
  });

  it('as parcelas intermediarias sao iguais e a ultima absorve o arredondamento', () => {
    const plano = gerarCronograma({ principal: 1250, taxaMensal: 0.024, prazoMeses: 12 });
    const cheia = parcelaPrice(1250, 0.024, 12);
    for (const p of plano.slice(0, -1)) expect(p.total).toBe(cheia);
    // Diferenca da ultima para as demais: so centavos.
    expect(Math.abs(plano[plano.length - 1].total - cheia)).toBeLessThan(0.1);
  });

  it('com carencia, so os juros sao pagos nos primeiros meses', () => {
    const plano = gerarCronograma({
      principal: 2000,
      taxaMensal: 0.02,
      prazoMeses: 8,
      carenciaMeses: 2,
    });
    expect(plano[0].principal).toBe(0);
    expect(plano[1].principal).toBe(0);
    expect(plano[0].total).toBe(40);
    expect(plano[2].principal).toBeGreaterThan(0);
    expect(resumirCronograma(plano).principal).toBe(2000);
    expect(plano[plano.length - 1].saldoDevedor).toBe(0);
  });

  it('sem juros, o plano e a divisao simples', () => {
    const plano = gerarCronograma({ principal: 1000, taxaMensal: 0, prazoMeses: 4 });
    expect(plano.map((p) => p.total)).toEqual([250, 250, 250, 250]);
    expect(resumirCronograma(plano).totalJuros).toBe(0);
  });

  it('vencimentos mensais preservam o dia e usam o ultimo dia quando o mes e mais curto', () => {
    const plano = gerarCronograma({
      principal: 300,
      taxaMensal: 0.01,
      prazoMeses: 4,
      primeiroVencimento: '2026-01-31',
    });
    expect(plano.map((p) => p.vencimento)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
  });

  it('taxa efetiva anual e custo efetivo mensal', () => {
    expect(taxaAnualEfetiva(0.024)).toBeCloseTo(0.3288, 3);
    const plano = gerarCronograma({ principal: 1000, taxaMensal: 0.02, prazoMeses: 12 });
    const totais = plano.map((p) => p.total);
    // Sem tarifa retida, o custo efetivo e a propria taxa.
    expect(custoEfetivoMensal(1000, totais)).toBeCloseTo(0.02, 4);
    // Com 4% retidos no desembolso, o custo sobe: o tomador recebe menos e paga o mesmo.
    expect(custoEfetivoMensal(960, totais)).toBeGreaterThan(0.02);
  });
});
