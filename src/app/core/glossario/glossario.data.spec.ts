import { describe, expect, it } from 'vitest';

import { GLOSSARIO, MODULOS_GLOSSARIO } from './glossario.data';

describe('glossario', () => {
  it('nao repete termo', () => {
    const termos = GLOSSARIO.map((v) => v.termo.toLowerCase());
    expect(new Set(termos).size).toBe(termos.length);
  });

  it('todo verbete tem resumo, local de uso e ao menos um modulo conhecido', () => {
    for (const v of GLOSSARIO) {
      expect(v.resumo.length, v.termo).toBeGreaterThan(20);
      expect(v.usadoEm.length, v.termo).toBeGreaterThan(5);
      expect(v.modulos.length, v.termo).toBeGreaterThan(0);
      for (const m of v.modulos) expect(MODULOS_GLOSSARIO, v.termo).toContain(m);
    }
  });

  it('cada modulo da lista de filtros tem ao menos um verbete', () => {
    for (const m of MODULOS_GLOSSARIO) {
      expect(
        GLOSSARIO.some((v) => v.modulos.includes(m)),
        m,
      ).toBe(true);
    }
  });
});
