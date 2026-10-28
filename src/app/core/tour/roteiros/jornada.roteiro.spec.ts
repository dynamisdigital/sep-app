import { describe, expect, it } from 'vitest';

import { ContextoRoteiro } from '../tour.model';
import { jornadaReal } from './jornada.roteiro';

// A operação completa nas telas reais: o que o roteiro precisa garantir sem abrir um navegador. A execução
// de ponta a ponta fica no teste E2E (`e2e/jornada-real.spec.ts`); aqui valem as regras de montagem.

const CONTEXTO: ContextoRoteiro = {
  demo: true,
  papel: null,
  mfa: false,
  carimbo: '000000',
  dados: {},
};

const PONTOS_DE_PARTIDA = [
  'sub',
  'envio',
  'cadastro',
  'proposta',
  'aprovada',
  'alocada',
  'assinado',
  'quitada',
];

describe('jornada completa (roteiro)', () => {
  const passos = jornadaReal.passos(CONTEXTO);

  it('parte da página inicial, reinicia os dados e só roda no ambiente de demonstração', () => {
    expect(jornadaReal.area).toBe('publica');
    expect(jornadaReal.rotaInicial).toBe('/');
    expect(jornadaReal.reiniciarDemo).toBe(true);
    expect(jornadaReal.impedimento?.(CONTEXTO)).toBeNull();
    expect(jornadaReal.impedimento?.({ ...CONTEXTO, demo: false })).toBeTruthy();
  });

  it('cada capítulo é uma seção, e o salto para ele prepara os dados do ponto de partida', () => {
    const secoes = [...new Set(passos.map((p) => p.secao).filter((s): s is string => !!s))];
    expect(secoes.length).toBeGreaterThanOrEqual(10);
    const mapa = jornadaReal.prepararSecao ?? {};
    // O primeiro capítulo não precisa de preparo (só reinicia); os demais apontam um ponto válido.
    for (const secao of secoes.filter((s) => s !== 'Correspondente')) {
      expect(PONTOS_DE_PARTIDA, `preparo de "${secao}"`).toContain(mapa[secao]);
    }
  });

  it('o primeiro passo de cada capítulo sabe levar a tela ao ponto certo ao saltar', () => {
    const vistos = new Set<string>();
    for (const [i, passo] of passos.entries()) {
      if (!passo.secao || passo.secao === passos[i - 1]?.secao) continue;
      vistos.add(passo.secao);
      // Ou o capítulo abre trocando de conta (entra na conta certa por conta própria), ou traz `entrada`.
      const trocaDeConta =
        passo.titulo === 'Ir para a entrada' || passo.titulo === 'Abrir o menu da conta';
      expect(trocaDeConta || !!passo.entrada?.length, `abertura de "${passo.secao}"`).toBe(true);
    }
    expect(vistos.size).toBeGreaterThanOrEqual(10);
  });

  it('todo passo que age tem alvo, e sair da conta e entrar são cliques com efeito', () => {
    for (const passo of passos) {
      const tipo = passo.acao?.tipo;
      if (tipo && tipo !== 'observar') expect(passo.alvo, passo.titulo).toBeTruthy();
      if (['Sair da conta', 'Acessar a plataforma'].includes(passo.titulo)) {
        expect(passo.acao).toMatchObject({ tipo: 'clicar', efeito: true });
      }
    }
  });

  it('as partes que mexem em dados só rodam no modo demonstração', () => {
    const gravam = passos.filter((p) => p.acao?.tipo === 'demo');
    expect(gravam.length).toBeGreaterThan(0);
    for (const passo of gravam) {
      expect(passo.acao).toMatchObject({ caminho: expect.stringMatching(/^\/__demo\//) });
    }
  });

  it('o capítulo de acessos bloqueados digita endereços e espera o acesso negado', () => {
    const tentativas = passos.filter(
      (p) => p.acao?.tipo === 'navegar' && p.secao === 'Acessos bloqueados',
    );
    expect(tentativas.length).toBe(3);
    for (const passo of tentativas) {
      expect(passo.aguardarRota?.test('/access-denied')).toBe(true);
    }
  });
});
