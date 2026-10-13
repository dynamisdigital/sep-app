import { describe, expect, it } from 'vitest';

import { LancamentoEscrow } from '../../../../core/credores/credores-escrow.models';
import { parseValorMonetario, sinalDoLancamento } from './escrow-format';

function lancamento(de: LancamentoEscrow['de'], para: LancamentoEscrow['para']): LancamentoEscrow {
  return {
    id: 'l-1',
    credorId: 'c-1',
    tipo: 'APORTE',
    valor: 10,
    de,
    para,
    operacaoId: null,
    parcela: null,
    descricao: '',
    dataLancamento: '2026-10-10T10:00:00Z',
  };
}

describe('parseValorMonetario', () => {
  it('aceita formato brasileiro e ponto decimal', () => {
    expect(parseValorMonetario('1.500,50')).toBe(1500.5);
    expect(parseValorMonetario('1500.5')).toBe(1500.5);
    expect(parseValorMonetario('R$ 300')).toBe(300);
    expect(parseValorMonetario('0,99')).toBe(0.99);
  });

  it('rejeita vazio, zero, negativo, texto e mais de 2 casas', () => {
    expect(parseValorMonetario('')).toBeNull();
    expect(parseValorMonetario('0')).toBeNull();
    expect(parseValorMonetario('-5')).toBeNull();
    expect(parseValorMonetario('abc')).toBeNull();
    expect(parseValorMonetario('10,999')).toBeNull();
  });
});

describe('sinalDoLancamento', () => {
  it('entrada vem de fora, saida vai para fora, o resto e movimento interno', () => {
    expect(sinalDoLancamento(lancamento('EXTERNO', 'DISPONIVEL'))).toBe('+');
    expect(sinalDoLancamento(lancamento('DISPONIVEL', 'EXTERNO'))).toBe('−');
    expect(sinalDoLancamento(lancamento('DISPONIVEL', 'RESERVADO'))).toBe('');
  });
});
