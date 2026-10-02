// SEP — Frontend
// Frontend Development: Daniel Möllmann
// Angular • TypeScript — 2026

/**
 * Donut de distribuicao: a arte que as telas operacionais usam para mostrar como um total se
 * reparte. O desenho e um `conic-gradient` com furo no meio, mais um halo por quadrante nas
 * cores das proprias fatias — o mesmo efeito homologado nos Mockups 15, 16 e 18.
 *
 * As cores saem dos tokens do tema, e nao de hexadecimal fixo: sem isso o donut fica com a
 * paleta do tema escuro quando o operador troca para o claro.
 */

export type TomDonut = 'azul' | 'ciano' | 'verde' | 'ambar' | 'vermelho' | 'roxo' | 'neutro';

export interface FaixaDonut {
  rotulo: string;
  valor: number;
  tom: TomDonut;
  /** Chave de dominio, quando a legenda precisa casar com o selo da tabela. */
  chave?: string | null;
}

/** Fatia pronta para a tela: o valor medido mais o rotulo e o percentual ja formatados. */
export interface FatiaDonut extends FaixaDonut {
  percentual: string;
}

const COR: Record<TomDonut, string> = {
  azul: 'var(--sep-chart-blue)',
  ciano: 'var(--sep-chart-cyan)',
  verde: 'var(--sep-chart-green)',
  ambar: 'var(--sep-chart-amber)',
  vermelho: 'var(--sep-chart-red)',
  roxo: 'var(--sep-chart-purple)',
  neutro: 'var(--sep-chart-neutral)',
};

// Canal RGB do mesmo tom, para o halo, que precisa de transparencia.
const CANAL: Record<TomDonut, string> = {
  azul: '--sep-c-blue',
  ciano: '--sep-c-cyan',
  verde: '--sep-c-green',
  ambar: '--sep-c-amber',
  vermelho: '--sep-c-red',
  roxo: '--sep-c-purple',
  neutro: '--sep-c-muted',
};

export function corDoTom(tom: TomDonut): string {
  return COR[tom] ?? COR.azul;
}

export function totalDonut(faixas: readonly FaixaDonut[]): number {
  return faixas.reduce((soma, faixa) => soma + faixa.valor, 0);
}

export function percentualDonut(valor: number, total: number): string {
  if (!total) return '0,0%';
  return `${((valor / total) * 100).toFixed(1).replace('.', ',')}%`;
}

/** Acrescenta o percentual a cada faixa, na ordem em que ela sera desenhada e listada. */
export function fatiasDonut(faixas: readonly FaixaDonut[]): FatiaDonut[] {
  const total = totalDonut(faixas);
  return faixas.map((faixa) => ({ ...faixa, percentual: percentualDonut(faixa.valor, total) }));
}

/**
 * `from 0deg` faz a primeira fatia comecar as 12 horas. Sem nenhum valor o donut fica com o
 * anel neutro inteiro, em vez de sumir — e o estado honesto para "nada aqui ainda".
 */
export function gradienteDonut(faixas: readonly FaixaDonut[]): string {
  const total = totalDonut(faixas);
  if (!total) return `conic-gradient(from 0deg, ${COR.neutro} 0deg 360deg)`;
  let inicio = 0;
  const partes = faixas
    .filter((faixa) => faixa.valor > 0)
    .map((faixa) => {
      const fim = inicio + (faixa.valor / total) * 360;
      const trecho = `${corDoTom(faixa.tom)} ${inicio.toFixed(2)}deg ${fim.toFixed(2)}deg`;
      inicio = fim;
      return trecho;
    });
  return `conic-gradient(from 0deg, ${partes.join(', ')})`;
}

/**
 * Halo nos quatro cantos, cada um no tom de uma das maiores fatias. E decorativo, mas segue a
 * distribuicao: se a fatia vermelha some, o halo vermelho some junto.
 */
export function haloDonut(faixas: readonly FaixaDonut[]): string {
  const tons = faixas
    .filter((faixa) => faixa.valor > 0)
    .slice(0, 4)
    .map((faixa) => CANAL[faixa.tom] ?? CANAL.azul);
  if (!tons.length) return 'none';
  const cantos = ['-5px -7px 14px', '7px -6px 14px', '8px 7px 15px', '-6px 8px 15px'];
  // A opacidade passa pelo interruptor de brilho: no tema claro o halo zera, como os demais.
  return cantos
    .map(
      (canto, i) =>
        `${canto} rgb(var(${tons[i % tons.length]}) / calc(21% * var(--sep-glow-alpha)))`,
    )
    .join(', ');
}
