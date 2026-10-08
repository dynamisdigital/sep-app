import { describe, expect, it } from 'vitest';

import { CARACTERES_POR_SEGUNDO, FalaRegistrada, trechoParaRetomar } from './trecho-retomada';

const TEXTO =
  'Este roteiro mostra como o correspondente credencia sub-correspondentes que lancam clientes.';

function fala(parcial: Partial<FalaRegistrada> = {}): FalaRegistrada {
  return { texto: TEXTO, taxa: 1, inicio: 0, fim: null, limite: null, ...parcial };
}

describe('trechoParaRetomar (volta 2 segundos ao retomar o tour)', () => {
  it('recomeca no inicio da palavra de 2 segundos antes e segue ate o fim do texto', () => {
    // 6 s de fala a 15 caracteres por segundo: o corte cai no caractere 90; 2 s antes e o 60.
    const trecho = trechoParaRetomar(fala(), 6000, 2000);

    expect(TEXTO.endsWith(trecho)).toBe(true);
    expect(trecho.startsWith(' ')).toBe(false);
    // Comeca numa palavra inteira, nunca no meio dela.
    expect(TEXTO[TEXTO.length - trecho.length - 1]).toBe(' ');
  });

  it('usa a posicao anunciada pelo navegador quando ele a informa', () => {
    const trecho = trechoParaRetomar(fala({ limite: 40 }), 60_000, 2000);

    // Em 40, menos 30 caracteres de 2 s, a releitura comeca por volta do caractere 10.
    expect(TEXTO.length - trecho.length).toBeLessThanOrEqual(10);
    expect(TEXTO.length - trecho.length).toBeGreaterThan(0);
  });

  it('com a fala nos primeiros 2 segundos, relê o texto desde o inicio', () => {
    expect(trechoParaRetomar(fala(), 1000, 2000)).toBe(TEXTO);
  });

  it('nao devolve nada se ainda nao falou ou se o texto e vazio', () => {
    expect(trechoParaRetomar(fala(), 0, 2000)).toBe('');
    expect(trechoParaRetomar(fala({ texto: '  ' }), 5000, 2000)).toBe('');
  });

  it('fala que ja terminou: relê o final se a pausa veio logo depois, e nada se veio muito depois', () => {
    const terminada = fala({ fim: 10_000 });

    const logo = trechoParaRetomar(terminada, 11_000, 2000);
    expect(logo.length).toBeGreaterThan(0);
    expect(TEXTO.endsWith(logo)).toBe(true);
    expect(trechoParaRetomar(terminada, 13_000, 2000)).toBe('');
  });

  it('a taxa mais rapida recua mais caracteres, porque a voz cobre mais por segundo', () => {
    const normal = trechoParaRetomar(fala({ limite: 80 }), 60_000, 2000);
    const rapida = trechoParaRetomar(fala({ limite: 80, taxa: 1.8 }), 60_000, 2000);

    expect(rapida.length).toBeGreaterThan(normal.length);
    expect(CARACTERES_POR_SEGUNDO).toBeGreaterThan(0);
  });
});
