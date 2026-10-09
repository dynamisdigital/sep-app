import { afterEach, describe, expect, it } from 'vitest';

import {
  caracteresLidos,
  extrairItens,
  faixaLida,
  mapearTexto,
  partesDe,
  textoVisivel,
} from './leitura-sincronizada';
import { escolherVoz } from './voz-pt-br';

function montar(html: string): HTMLElement {
  const raiz = document.createElement('div');
  raiz.innerHTML = html;
  document.body.appendChild(raiz);
  return raiz;
}

describe('leitura sincronizada: texto da página', () => {
  afterEach(() => (document.body.innerHTML = ''));

  it('extrai os blocos na ordem da página e ignora os vazios', () => {
    const raiz = montar(
      '<h1>Título</h1><p>  Um   parágrafo\n  com quebras. </p><p> </p><p>Outro.</p>',
    );
    const itens = extrairItens(raiz, 'h1, p');
    expect(itens.map((i) => i.visivel)).toEqual(['Título', 'Um parágrafo com quebras.', 'Outro.']);
    // Todo trecho falado termina em pontuação, para a voz fazer a pausa.
    for (const i of itens) expect(i.falado).toMatch(/[.!?:;]$/);
  });

  it('itens de lista numerada ganham a ordem falada; os de lista comum, não', () => {
    const raiz = montar('<ol><li>Cadastro</li><li>Análise</li></ol><ul><li>Solto</li></ul>');
    const falas = extrairItens(raiz, 'li').map((i) => i.falado);
    expect(falas[0]).toBe('Primeiro: Cadastro.');
    expect(falas[1]).toBe('Segundo: Análise.');
    expect(falas[2]).toBe('Solto.');
  });

  it('valores e siglas são ajustados só na fala; o texto visível não muda', () => {
    const raiz = montar('<p>O limite é R$ 15.000,00 na SEP.</p>');
    const [item] = extrairItens(raiz, 'p');
    expect(item.visivel).toBe('O limite é R$ 15.000,00 na SEP.');
    expect(item.falado).toContain('15000 reais');
    expect(item.falado).toContain('S E P');
  });

  it('cada trecho diz que fatia do bloco cobre, e as fatias fecham de 0 a 1 sem sobrar nem faltar', () => {
    const longo = Array.from(
      { length: 12 },
      () => 'Esta é uma frase de tamanho razoável para o teste.',
    ).join(' ');
    const raiz = montar(`<p>${longo}</p><p>Curto.</p>`);
    const partes = partesDe(extrairItens(raiz, 'p'));
    const doPrimeiro = partes.filter((p) => p.el === raiz.children[0]);
    expect(doPrimeiro.length).toBeGreaterThan(1);
    expect(doPrimeiro[0].f0).toBe(0);
    expect(doPrimeiro[doPrimeiro.length - 1].f1).toBeCloseTo(1, 10);
    for (let i = 1; i < doPrimeiro.length; i++)
      expect(doPrimeiro[i].f0).toBeCloseTo(doPrimeiro[i - 1].f1, 10);
  });
});

describe('leitura sincronizada: ponto exato de cada caractere', () => {
  afterEach(() => (document.body.innerHTML = ''));

  it('o mapa do texto bate com o texto visível, mesmo com espaços e quebras no HTML', () => {
    const raiz = montar('<p>\n   Dois   <strong>blocos</strong>\n  de texto.\n</p>');
    const p = raiz.firstElementChild as HTMLElement;
    expect(mapearTexto(p).texto).toBe(textoVisivel(p));
    expect(mapearTexto(p).texto).toBe('Dois blocos de texto.');
  });

  it('a faixa lida cobre exatamente os primeiros caracteres, atravessando elementos internos', () => {
    const raiz = montar('<p>Dois <strong>blocos</strong> de texto.</p>');
    const p = raiz.firstElementChild as HTMLElement;
    expect(faixaLida(p, 4)?.toString()).toBe('Dois');
    expect(faixaLida(p, 10)?.toString()).toBe('Dois bloco');
    expect(faixaLida(p, 999)?.toString()).toBe('Dois blocos de texto.');
    expect(faixaLida(p, 0)).toBeNull();
  });

  it('ignora ícones (svg) na contagem de caracteres', () => {
    const raiz = montar('<h2><svg><text>ícone</text></svg>Em resumo</h2>');
    const h2 = raiz.firstElementChild as HTMLElement;
    expect(mapearTexto(h2).texto).toBe('Em resumo');
  });

  it('caracteres lidos acompanham o avanço dentro do trecho e nunca passam do fim do bloco', () => {
    const parte = { el: document.createElement('p'), texto: 'x'.repeat(100), f0: 0.5, f1: 1 };
    expect(caracteresLidos(parte, 0, 200)).toBe(100);
    expect(caracteresLidos(parte, 50, 200)).toBe(150);
    expect(caracteresLidos(parte, 100, 200)).toBe(200);
    expect(caracteresLidos(parte, 9999, 200)).toBe(200);
    expect(caracteresLidos(parte, -5, 200)).toBe(100);
  });
});

describe('voz em português do Brasil', () => {
  const voz = (name: string, lang = 'pt-BR') => ({ name, lang }) as SpeechSynthesisVoice;

  it('prefere a voz feminina natural e nunca escolhe uma masculina conhecida', () => {
    const r = escolherVoz([
      voz('Microsoft Antonio Online (Natural)'),
      voz('Microsoft Maria'),
      voz('Microsoft Francisca Online (Natural)'),
      voz('Voz em inglês', 'en-US'),
    ]);
    expect(r.feminina).toBe(true);
    expect(r.voz?.name).toBe('Microsoft Francisca Online (Natural)');
  });

  it('sem voz feminina reconhecida, usa a primeira que não é masculina e avisa para subir o tom', () => {
    const r = escolherVoz([voz('Microsoft Daniel'), voz('Voz genérica')]);
    expect(r.feminina).toBe(false);
    expect(r.voz?.name).toBe('Voz genérica');
  });

  it('sem nenhuma voz em português, não escolhe nada', () => {
    expect(escolherVoz([voz('English', 'en-US')]).voz).toBeNull();
  });
});
