import { describe, expect, it } from 'vitest';

import { acaoDaTecla } from './tecla-pausa';

// `isTrusted` e somente leitura: o teste o define na instancia para simular teclado de verdade.
function tecla(
  alvo: HTMLElement | null,
  init: KeyboardEventInit & { confiavel?: boolean } = {},
): KeyboardEvent {
  const { confiavel = true, ...resto } = init;
  const evento = new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true, ...resto });
  Object.defineProperty(evento, 'isTrusted', { value: confiavel });
  if (alvo) Object.defineProperty(evento, 'target', { value: alvo });
  return evento;
}

describe('acaoDaTecla (barra de espaco do tour)', () => {
  it('pausa quando o tour esta rodando e retoma quando esta pausado', () => {
    expect(acaoDaTecla(tecla(document.body), 'rodando')).toBe('pausar');
    expect(acaoDaTecla(tecla(document.body), 'pausado')).toBe('continuar');
  });

  it('nao reage quando o tour terminou, parou ou nao existe', () => {
    for (const estado of ['concluido', 'interrompido', 'parado'] as const) {
      expect(acaoDaTecla(tecla(document.body), estado)).toBeNull();
    }
  });

  it('ignora outras teclas', () => {
    expect(
      acaoDaTecla(tecla(document.body, { code: 'Enter', key: 'Enter' }), 'rodando'),
    ).toBeNull();
    expect(acaoDaTecla(tecla(document.body, { code: 'KeyA', key: 'a' }), 'rodando')).toBeNull();
  });

  it('nao rouba a barra de espaco de quem digita em campo de texto', () => {
    for (const tag of ['input', 'textarea', 'select']) {
      const campo = document.createElement(tag);
      expect(acaoDaTecla(tecla(campo), 'rodando')).toBeNull();
    }
    const editavel = document.createElement('div');
    editavel.contentEditable = 'true';
    // O jsdom nao calcula isContentEditable; o atributo basta para o motor real.
    Object.defineProperty(editavel, 'isContentEditable', { value: true });
    expect(acaoDaTecla(tecla(editavel), 'rodando')).toBeNull();
  });

  it('funciona com o foco em botao ou link, que o atalho substitui', () => {
    expect(acaoDaTecla(tecla(document.createElement('button')), 'rodando')).toBe('pausar');
    expect(acaoDaTecla(tecla(document.createElement('a')), 'pausado')).toBe('continuar');
  });

  it('ignora eventos sinteticos, como os espacos que o proprio roteiro digita', () => {
    expect(acaoDaTecla(tecla(document.body, { confiavel: false }), 'rodando')).toBeNull();
  });

  it('ignora a tecla mantida pressionada e as combinacoes com Ctrl, Alt ou Meta', () => {
    expect(acaoDaTecla(tecla(document.body, { repeat: true }), 'rodando')).toBeNull();
    expect(acaoDaTecla(tecla(document.body, { ctrlKey: true }), 'rodando')).toBeNull();
    expect(acaoDaTecla(tecla(document.body, { altKey: true }), 'rodando')).toBeNull();
    expect(acaoDaTecla(tecla(document.body, { metaKey: true }), 'rodando')).toBeNull();
  });
});
