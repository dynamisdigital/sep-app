import { afterEach, describe, expect, it } from 'vitest';
import { escalaDoLayout } from './escala-layout';

describe('coordenadas sob a escala inicial', () => {
  afterEach(() => document.body.replaceChildren());
  it('converte deslocamentos dentro do quadro e preserva o overlay externo', () => {
    document.body.innerHTML =
      '<div class="sep-viewport" style="zoom:0.7"><div id="alvo"></div></div><div id="overlay"></div>';
    expect(escalaDoLayout(document.getElementById('alvo')!)).toBe(0.7);
    expect(escalaDoLayout(document.getElementById('overlay')!)).toBe(1);
  });
});
