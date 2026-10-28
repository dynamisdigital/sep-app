import { describe, expect, it } from 'vitest';
import { EXPERIENCIAS_VISUAIS } from './demonstracao-apresentacao';
import { roteiroDaEtapa } from './demonstracao-etapas';

const contexto = { demo: true, papel: null, mfa: false, carimbo: '000000', dados: {} };

describe('etapas independentes da demonstração', () => {
  for (const experiencia of EXPERIENCIAS_VISUAIS) {
    it(`${experiencia.id}: cinco roteiros distintos, delimitados e bloqueados fora do demo`, () => {
      const assinaturas = new Set<string>();
      for (let indice = 0; indice < 5; indice++) {
        const roteiro = roteiroDaEtapa(experiencia.id, indice)!;
        expect(roteiro.rotaFinal).toBe(`/demonstracao/${experiencia.id}`);
        expect(roteiro.impedimento?.({ ...contexto, demo: false })).toBeTruthy();
        const passos = roteiro.passos(contexto);
        expect(passos[0].titulo).toBe(experiencia.steps[indice].title);
        expect(passos.at(-1)?.titulo).toBe(
          `Etapa ${String(indice + 1).padStart(2, '0')} concluída`,
        );
        expect(new Set(passos.map((p) => p.secao)).size).toBe(1);
        expect(passos.every((p) => !p.entrada)).toBe(true);
        assinaturas.add(JSON.stringify(passos.slice(1, -1).map((p) => [p.titulo, p.alvo])));
      }
      expect(assinaturas.size).toBe(5);
    });
  }
  it('ignora cartões e perfis inexistentes', () => {
    expect(roteiroDaEtapa('desconhecido', 0)).toBeUndefined();
    expect(roteiroDaEtapa('cliente', 5)).toBeUndefined();
    expect(roteiroDaEtapa('cliente', -1)).toBeUndefined();
  });
});
