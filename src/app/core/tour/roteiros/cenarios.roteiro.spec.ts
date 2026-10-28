import { describe, expect, it } from 'vitest';
import { ROTEIROS_CENARIOS, TOUR_POR_CENARIO } from './cenarios.roteiro';
import { jornadaReal } from './jornada.roteiro';

const ctx = { demo: true, papel: null, mfa: false, carimbo: '000000', dados: {} };

describe('demonstrações limitadas ao cenário escolhido', () => {
  it('somente Operação completa usa a jornada que percorre todos os perfis', () => {
    expect(TOUR_POR_CENARIO['operacao_completa']).toBe(jornadaReal.id);
    expect(ROTEIROS_CENARIOS).toHaveLength(5);
    for (const roteiro of ROTEIROS_CENARIOS) expect(roteiro.id).not.toBe(jornadaReal.id);
    expect(
      new Set(
        jornadaReal
          .passos(ctx)
          .map((p) => p.secao)
          .filter(Boolean),
      ).size,
    ).toBeGreaterThanOrEqual(10);
  });

  it('cada cenário tem só uma seção, orientação inicial e encerramento próprio', () => {
    for (const roteiro of ROTEIROS_CENARIOS) {
      const passos = roteiro.passos(ctx);
      expect(new Set(passos.map((p) => p.secao)).size, roteiro.id).toBe(1);
      expect(passos[0].texto).toContain('começa e termina');
      expect(passos.at(-1)?.titulo).toContain('concluído');
      expect(roteiro.rotaFinal).toBe(`/demonstracao/${roteiro.id.replace('jornada-cenario-', '')}`);
      expect(passos.every((p) => !p.entrada)).toBe(true);
      expect(passos.some((p) => p.alvo === '#login-username')).toBe(true);
      expect(roteiro.impedimento?.({ ...ctx, demo: false })).toBeTruthy();
    }
  });

  it('inclui o subcorrespondente inteiro, mesmo passos sem seção explícita, e para antes do backoffice', () => {
    const sub = ROTEIROS_CENARIOS.find((r) => r.id === TOUR_POR_CENARIO['subcorrespondente'])!;
    const passos = sub.passos(ctx);
    expect(passos.some((p) => p.titulo === 'Novo prospect')).toBe(true);
    expect(passos.some((p) => p.titulo === 'Meus envios')).toBe(true);
    expect(passos.some((p) => p.titulo === 'Validar')).toBe(false);
    expect(passos.some((p) => p.titulo === 'Perfil: backoffice')).toBe(false);
    expect(passos.every((p) => p.secao === 'Subcorrespondente')).toBe(true);
    expect(sub.prepararAte).toBe('sub');
  });

  it('prepara dados anteriores sem executar outros capítulos', () => {
    const preparos: Record<string, string | undefined> = {
      correspondente: undefined,
      subcorrespondente: 'sub',
      cliente: 'cadastro',
      backoffice: 'envio',
      financiador: 'aprovada',
    };
    for (const [perfil, preparo] of Object.entries(preparos)) {
      const roteiro = ROTEIROS_CENARIOS.find((r) => r.id === TOUR_POR_CENARIO[perfil])!;
      expect(roteiro.prepararAte, perfil).toBe(preparo);
      expect(roteiro.reiniciarDemo).toBe(true);
    }
  });
});
