import type { PostBlog } from './site-blog';

// Preparo do texto do blog para a leitura em áudio. A voz é a do próprio navegador (Web Speech API), que
// lê melhor trechos curtos: um parágrafo longo pode ser cortado no meio em alguns navegadores. Por isso o
// texto vira uma lista de segmentos, cada um com no máximo ~220 caracteres, quebrados em fim de frase.

const LIMITE_SEGMENTO = 220;

/** Quebra um parágrafo em frases e junta frases curtas até o limite, sem cortar uma frase ao meio. */
export function segmentar(texto: string, limite = LIMITE_SEGMENTO): string[] {
  const frases = texto
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?;:])\s+(?=[A-ZÀ-Ú0-9"“(])/u)
    .filter(Boolean);
  const saida: string[] = [];
  let atual = '';
  for (const frase of frases) {
    if (atual && `${atual} ${frase}`.length > limite) {
      saida.push(atual);
      atual = frase;
    } else {
      atual = atual ? `${atual} ${frase}` : frase;
    }
  }
  if (atual) saida.push(atual);
  // Uma frase sozinha acima do limite é quebrada na vírgula mais próxima, para o motor de voz não travar.
  return saida.flatMap((s) => (s.length > limite * 1.6 ? quebrarNaVirgula(s, limite) : [s]));
}

function quebrarNaVirgula(texto: string, limite: number): string[] {
  const partes = texto.split(/(?<=,)\s+/);
  const saida: string[] = [];
  let atual = '';
  for (const parte of partes) {
    if (atual && `${atual} ${parte}`.length > limite) {
      saida.push(atual);
      atual = parte;
    } else {
      atual = atual ? `${atual} ${parte}` : parte;
    }
  }
  if (atual) saida.push(atual);
  return saida;
}

/** Tira o que a voz leria mal: símbolos, siglas com ponto e marcas de lista. */
export function limparParaVoz(texto: string): string {
  return texto
    .replace(/R\$\s?([\d.]+)(?:,(\d{2}))?/g, (_, reais: string, centavos?: string) =>
      centavos && centavos !== '00'
        ? `${reais.replace(/\./g, '')} reais e ${Number(centavos)} centavos`
        : `${reais.replace(/\./g, '')} reais`,
    )
    .replace(/(\d+)%/g, '$1 por cento')
    .replace(/\bSEP\b/g, 'S E P')
    .replace(/\bFGC\b/g, 'F G C')
    .replace(/\bKYC\b/g, 'K Y C')
    .replace(/\bKYB\b/g, 'K Y B')
    .replace(/\bPLD\b/g, 'P L D')
    .replace(/\bLGPD\b/g, 'L G P D')
    .replace(/\bCVM\b/g, 'C V M')
    .replace(/\bCET\b/g, 'C E T')
    .replace(/\bSCR\b/g, 'S C R')
    .replace(/\bCMN\b/g, 'C M N')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Lista de segmentos para ler em voz alta: título, resumo, o corpo na ordem, o "em resumo" e o aviso.
 * Listas numeradas ganham "primeiro, segundo..." para a voz marcar a ordem, e títulos de seção viram
 * uma frase própria, com pausa.
 */
export function textoParaLeitura(post: PostBlog, aviso: string): string[] {
  const ordinais = [
    'Primeiro',
    'Segundo',
    'Terceiro',
    'Quarto',
    'Quinto',
    'Sexto',
    'Sétimo',
    'Oitavo',
  ];
  const bruto: string[] = [post.titulo, post.resumo];
  for (const bloco of post.blocos) {
    switch (bloco.t) {
      case 'h2':
        bruto.push(`${bloco.v}.`);
        break;
      case 'p':
      case 'destaque':
        bruto.push(bloco.v);
        break;
      case 'ul':
        bruto.push(...bloco.v);
        break;
      case 'ol':
        bruto.push(...bloco.v.map((item, i) => `${ordinais[i] ?? `Item ${i + 1}`}: ${item}`));
        break;
    }
  }
  bruto.push('Em resumo.', ...post.emResumo, aviso);
  return bruto.flatMap((t) => segmentar(limparParaVoz(t)));
}
