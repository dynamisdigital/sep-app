import { describe, expect, it } from 'vitest';
import { jornadaReal } from '../../../core/tour/roteiros/jornada.roteiro';
import { EXPERIENCIAS } from './demonstracao-dados';
import { SECOES_DEMO } from './demonstracao.component';

const contexto = { demo: true, papel: null, mfa: false, carimbo: '000000', dados: {} };

describe('vínculos da demonstração com o tour real', () => {
  it('cada perfil aponta a um capítulo existente com sua entrada de conta', () => {
    const passos = jornadaReal.passos(contexto);
    for (const experiencia of EXPERIENCIAS) {
      expect(Object.hasOwn(SECOES_DEMO, experiencia.id)).toBe(true);
      const secao = SECOES_DEMO[experiencia.id];
      if (!secao) continue;
      const primeiro = passos.find((p) => p.secao === secao);
      expect(primeiro, experiencia.id).toBeDefined();
      const entrada = primeiro?.entrada ?? [primeiro!];
      expect(
        entrada.some((p) => p.alvo === '#login-username' || p.alvo === '.landing-login'),
        experiencia.id,
      ).toBe(true);
    }
  });

  it('a jornada que grava dados é bloqueada fora da demonstração', () => {
    expect(jornadaReal.impedimento?.({ ...contexto, demo: false })).toBeTruthy();
  });
});
