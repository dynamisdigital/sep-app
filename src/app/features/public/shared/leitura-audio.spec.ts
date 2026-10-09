import { describe, expect, it } from 'vitest';

import { limparParaVoz, segmentar } from './leitura-audio';

describe('leitura em áudio: preparo do texto', () => {
  it('quebra em fim de frase e nunca passa do limite de um trecho', () => {
    const frase = 'Esta é uma frase de tamanho razoável para o teste de segmentação.';
    const texto = Array.from({ length: 12 }, () => frase).join(' ');
    const trechos = segmentar(texto);
    expect(trechos.length).toBeGreaterThan(1);
    for (const t of trechos) {
      expect(t.length).toBeLessThanOrEqual(220);
      expect(t.endsWith('.')).toBe(true);
    }
    // Nada se perde: juntando os trechos, o texto volta inteiro.
    expect(trechos.join(' ')).toBe(texto);
  });

  it('uma frase muito longa é quebrada na vírgula, para a voz não travar', () => {
    const longa = Array.from({ length: 30 }, (_, i) => `item número ${i + 1}`).join(', ') + '.';
    const trechos = segmentar(longa);
    expect(trechos.length).toBeGreaterThan(1);
    for (const t of trechos) expect(t.length).toBeLessThanOrEqual(260);
  });

  it('valores, percentuais e siglas viram o que a voz deve falar', () => {
    expect(limparParaVoz('O limite é R$ 15.000,00 por tomador.')).toContain('15000 reais');
    expect(limparParaVoz('Tarifa de 4% do valor.')).toContain('4 por cento');
    expect(limparParaVoz('Uma SEP e o FGC.')).toBe('Uma S E P e o F G C.');
    expect(limparParaVoz('R$ 1.162,50')).toBe('1162 reais e 50 centavos');
  });
});
