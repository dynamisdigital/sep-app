import { limparParaVoz, segmentar } from './leitura-audio';

// Leitura em áudio sincronizada: a parte lida do texto fica destacada na própria página, no ritmo da voz,
// como no leitor do projeto Ponte de Liquidez. Aqui ficam as funções puras (extrair o texto da página,
// quebrá-lo em trechos e achar o ponto exato de cada caractere); o componente `sep-ouvir-texto` cuida da voz,
// da tarja e do destaque.

const ORDINAIS = [
  'Primeiro',
  'Segundo',
  'Terceiro',
  'Quarto',
  'Quinto',
  'Sexto',
  'Sétimo',
  'Oitavo',
];

/** Um bloco de texto da página que será lido: o elemento, o texto como aparece e o texto como será falado. */
export interface ItemLeitura {
  el: HTMLElement;
  visivel: string;
  falado: string;
}

/** Um trecho curto, falado de uma vez. `f0` e `f1` dizem que fatia do elemento ele cobre (de 0 a 1). */
export interface ParteLeitura {
  el: HTMLElement;
  texto: string;
  f0: number;
  f1: number;
}

/** Texto do elemento como o leitor o vê, com cada sequência de espaços virando um só. */
export function textoVisivel(el: Element): string {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Elementos do `escopo` que casam com o `seletor`, na ordem em que aparecem na página. Itens de lista
 * numerada ganham "primeiro, segundo..." só na fala, e todo trecho termina em pontuação para a voz fazer
 * a pausa.
 */
export function extrairItens(escopo: ParentNode, seletor: string): ItemLeitura[] {
  const itens: ItemLeitura[] = [];
  escopo.querySelectorAll<HTMLElement>(seletor).forEach((el) => {
    const visivel = textoVisivel(el);
    if (!visivel) return;
    let falado = limparParaVoz(visivel);
    if (el.matches('li') && el.parentElement?.tagName === 'OL') {
      const i = Array.from(el.parentElement.children).indexOf(el);
      falado = `${ORDINAIS[i] ?? `Item ${i + 1}`}: ${falado}`;
    }
    if (!/[.!?:;]$/.test(falado)) falado += '.';
    itens.push({ el, visivel, falado });
  });
  return itens;
}

/** Quebra cada item em trechos curtos e registra que fatia do item cada trecho cobre. */
export function partesDe(itens: ItemLeitura[]): ParteLeitura[] {
  const partes: ParteLeitura[] = [];
  for (const item of itens) {
    const trechos = segmentar(item.falado);
    const total = trechos.reduce((soma, t) => soma + t.length, 0) || 1;
    let acumulado = 0;
    for (const texto of trechos) {
      partes.push({
        el: item.el,
        texto,
        f0: acumulado / total,
        f1: (acumulado + texto.length) / total,
      });
      acumulado += texto.length;
    }
  }
  return partes;
}

/** Um caractere do texto visível e o ponto do documento em que ele está. */
export interface PontoDoTexto {
  no: Text;
  indice: number;
}

export interface MapaDoTexto {
  texto: string;
  pontos: PontoDoTexto[];
}

const mapas = new WeakMap<Element, MapaDoTexto>();

/**
 * Para cada caractere do texto visível do elemento, o nó e a posição onde ele está. Sequências de espaços
 * contam como um só, como em `textoVisivel`, para o índice cair no mesmo lugar do texto lido.
 */
export function mapearTexto(el: Element): MapaDoTexto {
  const guardado = mapas.get(el);
  if (guardado) return guardado;
  const pontos: PontoDoTexto[] = [];
  const letras: string[] = [];
  const percurso = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.parentElement?.closest('svg,script,style')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  });
  while (percurso.nextNode()) {
    const no = percurso.currentNode as Text;
    const valor = no.nodeValue ?? '';
    for (let i = 0; i < valor.length; i++) {
      const espaco = /\s/.test(valor[i]);
      if (espaco && (letras.length === 0 || letras[letras.length - 1] === ' ')) continue;
      letras.push(espaco ? ' ' : valor[i]);
      pontos.push({ no, indice: i });
    }
  }
  while (letras.length && letras[letras.length - 1] === ' ') {
    letras.pop();
    pontos.pop();
  }
  const mapa = { texto: letras.join(''), pontos };
  mapas.set(el, mapa);
  return mapa;
}

/** Faixa do começo do elemento até o caractere `ate` (exclusive), ou `null` se ainda não há o que marcar. */
export function faixaLida(el: Element, ate: number): Range | null {
  const { pontos } = mapearTexto(el);
  const n = Math.max(0, Math.min(pontos.length, Math.floor(ate)));
  if (n === 0) return null;
  const faixa = document.createRange();
  faixa.setStart(pontos[0].no, pontos[0].indice);
  faixa.setEnd(pontos[n - 1].no, pontos[n - 1].indice + 1);
  return faixa;
}

/**
 * Quantos caracteres do elemento já foram lidos, dado o quanto do trecho já foi falado.
 * `falados` é a posição dentro do texto falado do trecho; o trecho cobre a fatia `f0..f1` do elemento.
 */
export function caracteresLidos(
  parte: ParteLeitura,
  falados: number,
  totalDoElemento: number,
): number {
  const dentro = Math.max(0, Math.min(1, falados / Math.max(1, parte.texto.length)));
  return Math.round((parte.f0 + (parte.f1 - parte.f0) * dentro) * totalDoElemento);
}
