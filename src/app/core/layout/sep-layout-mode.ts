/**
 * SEP — Frontend
 *
 * Frontend Development:
 * Daniel Möllmann
 *
 * Angular • TypeScript • SCSS
 * 2026
 */

/**
 * Modo de apresentação de um componente, derivado do **espaço que ele recebeu** — e não da
 * largura da janela.
 *
 * Um painel pode ocupar um terço de um monitor 4K, e uma tela inteira num notebook estreito. Os
 * dois casos pedem apresentações diferentes, e nenhum deles é descrito por "desktop" ou "mobile".
 */
export type SepLayoutMode = 'full' | 'half' | 'third';

/** O que uma página pode declarar: um modo fixo, ou deixar o componente medir o próprio espaço. */
export type SepLayoutModeInput = SepLayoutMode | 'auto';

/**
 * Fronteiras do contrato, em pixels de **largura do container**.
 *
 * Definidas uma única vez. O SCSS repete estes mesmos números em
 * `styles/_sep-responsivo.scss`; se mudarem aqui, mudam lá — são o mesmo contrato visto de dois
 * lados. Os valores saíram da mediana dos 29 breakpoints de largura que existiam espalhados:
 * a maioria colapsava grade de duas colunas entre 900px e 1100px, e reorganizava para coluna
 * única abaixo de 640px.
 */
export const SEP_LAYOUT_LIMITES = {
  /** Abaixo disto o componente tem largura de um terço da área operacional. */
  third: 620,
  /** Abaixo disto, metade. Acima, tela inteira. */
  half: 960,
} as const;

/** Resolve o modo a partir da largura disponível ao componente. */
export function sepModoPorLargura(largura: number): SepLayoutMode {
  if (largura < SEP_LAYOUT_LIMITES.third) return 'third';
  if (largura < SEP_LAYOUT_LIMITES.half) return 'half';
  return 'full';
}
