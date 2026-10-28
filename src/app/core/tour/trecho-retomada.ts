// Retomada do tour depois de uma pausa: a narracao volta uns segundos antes do ponto em que parou,
// para quem pausou nao perder o fio. A sintese de voz do navegador nao permite "voltar 2 segundos"
// no audio, entao o recuo e feito no texto: a fala recomeca no inicio da palavra que estava no ar
// ha 2 segundos e segue ate o fim do passo. Sem dependencia de Angular, para ser testado sozinho.

/** Velocidade media da fala em portugues, em caracteres por segundo, na taxa 1 da sintese. */
export const CARACTERES_POR_SEGUNDO = 15;

export interface FalaRegistrada {
  texto: string;
  /** Taxa usada na sintese (`SpeechSynthesisUtterance.rate`). */
  taxa: number;
  /** Quando a fala foi pedida (`performance.now()`). */
  inicio: number;
  /** Quando terminou sozinha; `null` enquanto estiver no ar ou se foi cortada. */
  fim: number | null;
  /** Posicao da ultima palavra anunciada pelo navegador; `null` se ele nao anuncia (vozes online). */
  limite: number | null;
}

/**
 * O que reler ao retomar: do ponto de `janelaMs` antes do corte ate o fim do texto, comecando no
 * inicio de uma palavra. Devolve vazio quando nao ha o que reler: nada foi falado, ou a fala
 * terminou ha mais que a janela (a pausa caiu num silencio).
 */
export function trechoParaRetomar(fala: FalaRegistrada, agora: number, janelaMs: number): string {
  const { texto } = fala;
  if (!texto.trim()) return '';
  const porSegundo = CARACTERES_POR_SEGUNDO * fala.taxa;

  let atual: number;
  if (fala.fim !== null) {
    if (agora - fala.fim > janelaMs) return '';
    atual = texto.length;
  } else {
    const estimado = Math.min(
      texto.length,
      Math.max(0, ((agora - fala.inicio) / 1000) * porSegundo),
    );
    atual = fala.limite ?? estimado;
  }
  if (atual <= 0) return '';

  const recuado = Math.max(0, atual - (janelaMs / 1000) * porSegundo);
  if (recuado === 0) return texto;
  const espaco = texto.lastIndexOf(' ', recuado);
  return texto.slice(espaco < 0 ? 0 : espaco + 1);
}
