import { describe, expect, it } from 'vitest';

import { formatarDuracao } from './backoffice-format';

/**
 * `formatarDuracao` nao tinha NENHUM teste ate a F-24.4 — e e por isso que o `NaNmin` sobreviveu
 * desde que o KPI existe. O mock MSW devolvia `7200` (numero), mais correto que o servidor real,
 * entao nem a cobertura por componente via o defeito.
 *
 * O produtor e `java.time.Duration.toString()` sobre `Duration.ofSeconds(Math.round(...))` ou
 * `Duration.ZERO` (`ConsultarVisaoConsolidadaUseCase.java:121-125`): sempre inteiro, nunca negativo,
 * e nunca com componente de dias — `Duration.ofDays(2)` sai `"PT48H"`.
 */
describe('formatarDuracao', () => {
  it.each([
    ['PT2H', '2h'],
    ['PT30M', '30min'],
    ['PT1H30M', '1h 30min'],
    ['PT48H', '48h'],
    ['PT45S', '1min'],
    ['PT1M30S', '2min'],
  ])('%s -> %s', (iso, esperado) => {
    expect(formatarDuracao(iso)).toBe(esperado);
  });

  /**
   * `PT0S` e `Duration.ZERO`, valor REAL de producao: o use case devolve zero quando nao ha amostra
   * no periodo. O travessao comunica "sem dados", que e o que zero significa aqui.
   */
  it('PT0S (Duration.ZERO, sem amostra no periodo) vira travessao', () => {
    expect(formatarDuracao('PT0S')).toBe('—');
  });

  /**
   * A regressao que esta Task fecha. Antes, a guarda era `!segundos || segundos <= 0` sobre um
   * `number`: `"PT2H"` e truthy e `"PT2H" <= 0` e falso, entao passava direto para
   * `Math.round("PT2H" / 60)` = `NaN` e a tela mostrava `NaNmin`. Qualquer entrada nao parseavel
   * tem de virar travessao, nunca `NaN`.
   */
  it.each([
    ['string vazia', ''],
    ['texto solto', 'duas horas'],
    ['ISO sem componente', 'PT'],
    ['formato de periodo (o Duration nunca emite dias)', 'P2D'],
    ['numero como string, formato antigo', '7200'],
  ])('entrada nao parseavel (%s) vira travessao, nao NaN', (_caso, entrada) => {
    expect(formatarDuracao(entrada)).toBe('—');
  });

  /**
   * O tipo diz `string`, mas o payload e `unknown` no fio: um backend antigo — ou um mock
   * desatualizado, que foi exatamente o caso ate esta Task — manda numero. Tem de virar travessao,
   * e nao explodir no `exec`.
   */
  it.each([
    ['numero', 7200],
    ['nulo', null],
    ['indefinido', undefined],
  ])('entrada nao-string (%s) vira travessao, sem lancar', (_tipo, entrada) => {
    expect(() => formatarDuracao(entrada as unknown as string)).not.toThrow();
    expect(formatarDuracao(entrada as unknown as string)).toBe('—');
  });
});
