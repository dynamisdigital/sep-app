import { describe, expect, it } from 'vitest';

import {
  aplicarMascara,
  desformatarNumero,
  formatarDuracao,
  formatarMoeda,
  formatarNumero,
  formatarValorParametro,
  mascararCep,
  mascararCnpj,
  mascararCpf,
  mascararCpfCnpj,
  mascararMoeda,
  mascararTelefone,
  paraDecimalCanonico,
} from './br-format';

describe('br-format', () => {
  it('numero sai com ponto no milhar e virgula no decimal', () => {
    expect(formatarNumero(1234.5, 2)).toBe('1.234,50');
    expect(formatarNumero(15000, 2)).toBe('15.000,00');
    expect(formatarNumero(1234567, 0)).toBe('1.234.567');
  });

  it('duracao sai em dias, horas e minutos, sem zeros sobrando', () => {
    expect(formatarDuracao(8_100_000)).toBe('2h 15min');
    expect(formatarDuracao(2_700_000)).toBe('45min');
    expect(formatarDuracao(7_200_000)).toBe('2h');
    expect(formatarDuracao(190_800_000)).toBe('2d 5h');
    expect(formatarDuracao(172_800_000)).toBe('2d');
    expect(formatarDuracao(20_000)).toBe('menos de 1min');
  });

  it('moeda sai em BRL', () => {
    // O separador que o Intl usa entre simbolo e numero e um espaco nao quebravel.
    expect(formatarMoeda(1234.5).replace(/\u00a0/g, ' ')).toBe('R$ 1.234,50');
  });

  it('mascara documentos', () => {
    expect(mascararCpf('52998224725')).toBe('529.982.247-25');
    expect(mascararCnpj('11111111000191')).toBe('11.111.111/0001-91');
    expect(mascararCpfCnpj('52998224725')).toBe('529.982.247-25');
    expect(mascararCpfCnpj('11111111000191')).toBe('11.111.111/0001-91');
  });

  it('mascara parcial acompanha a digitacao', () => {
    expect(mascararCpf('529')).toBe('529');
    expect(mascararCpf('5299')).toBe('529.9');
    expect(mascararCpf('529982')).toBe('529.982');
    expect(mascararCpf('5299822')).toBe('529.982.2');
  });

  it('mascara telefone fixo e celular', () => {
    expect(mascararTelefone('1133334444')).toBe('(11) 3333-4444');
    expect(mascararTelefone('11933334444')).toBe('(11) 93333-4444');
    expect(mascararCep('01310930')).toBe('01310-930');
  });

  // Os digitos entram como centavos: e o unico comportamento que nao obriga o usuario a
  // posicionar a virgula sozinho.
  it('moeda digitada da direita para a esquerda', () => {
    expect(mascararMoeda('1')).toBe('0,01');
    expect(mascararMoeda('1500')).toBe('15,00');
    expect(mascararMoeda('1500000')).toBe('15.000,00');
    expect(mascararMoeda('')).toBe('');
  });

  it('volta ao canonico que o backend espera', () => {
    expect(paraDecimalCanonico('15.000,00')).toBe('15000.00');
    expect(paraDecimalCanonico('15000.00')).toBe('15000.00');
    expect(desformatarNumero('1.234,50')).toBe(1234.5);
  });

  it('valor de parametro sai por tipo', () => {
    expect(formatarValorParametro('15000.00', 'DECIMAL')).toBe('15.000,00');
    expect(formatarValorParametro('700', 'INTEGER')).toBe('700');
    expect(formatarValorParametro('1500', 'INTEGER')).toBe('1.500');
    expect(formatarValorParametro('true', 'BOOLEAN')).toBe('Sim');
    // STRING e identificador, nao numero: passa intacta.
    expect(formatarValorParametro('sandbox-v2', 'STRING')).toBe('sandbox-v2');
  });

  it('aplicarMascara despacha por tipo', () => {
    expect(aplicarMascara('cpf', '52998224725')).toBe('529.982.247-25');
    expect(aplicarMascara('numero', '1500')).toBe('1.500');
  });
});
