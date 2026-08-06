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
  /**
   * O arredondamento para o minuto mais proximo (`PT45S` -> `1min`, `PT1M30S` -> `2min`) e
   * pre-existente e intencional: o KPI tem granularidade de minuto. Travado aqui de proposito, para
   * que mudar isso seja decisao consciente e nao efeito colateral de uma refatoracao do parse.
   */
  it.each([
    ['PT2H', '2h'],
    ['PT30M', '30min'],
    ['PT1H30M', '1h 30min'],
    ['PT48H', '48h'],
    ['PT8760H', '8760h'],
    ['PT45S', '1min'],
    ['PT1M30S', '2min'],
    ['PT1H30M45S', '1h 31min'],
  ])('%s -> %s', (iso, esperado) => {
    expect(formatarDuracao(iso)).toBe(esperado);
  });

  /**
   * `PT0S` e `Duration.ZERO`, valor REAL de producao — e chega por tres caminhos que o fio nao
   * distingue: sem amostra no periodo, media abaixo de meio segundo, e falha da query absorvida pelo
   * `resiliente(...)` do use case. O teste NAO nomeia a causa, porque a tela nao consegue observa-la.
   */
  it('PT0S (Duration.ZERO) vira travessao', () => {
    expect(formatarDuracao('PT0S')).toBe('—');
  });

  /**
   * Ramo que so passou a ser alcancavel nesta Task: com o caminho numerico anterior o resultado era
   * sempre `NaN` contra o servidor real. `Math.round(29 / 60)` da 0, e `0min` num KPI le-se como
   * "zero" — pior que dizer que e menos de um minuto.
   */
  it.each([
    ['PT1S', '< 1min'],
    ['PT29S', '< 1min'],
  ])('%s (abaixo do minuto) -> %s, e nao 0min', (iso, esperado) => {
    expect(formatarDuracao(iso)).toBe(esperado);
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
