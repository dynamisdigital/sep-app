import { describe, expect, it } from 'vitest';
import { demonstracaoCenarios } from './demonstracao.roteiro';
import { EXPERIENCIAS_VISUAIS } from '../../../features/public/demonstracao/demonstracao-apresentacao';

const contexto = { demo: false, papel: null, mfa: false, carimbo: '000000', dados: {} };

describe('tour de apresentação do módulo Demonstração', () => {
  it('é público, parte da galeria e não inicia operações ou outro tour', () => {
    expect(demonstracaoCenarios.area).toBe('publica');
    expect(demonstracaoCenarios.rotaInicial).toBe('/demonstracao');
    for (const passo of demonstracaoCenarios.passos(contexto)) {
      expect(passo.acao?.tipo).not.toBe('demo');
      expect(passo.acao?.tipo).not.toBe('digitar');
      if (passo.acao?.tipo === 'clicar') expect(passo.acao.efeito).not.toBe(true);
      expect(String(passo.alvo ?? '')).not.toContain('.hero .botao');
    }
  });

  it('percorre as seis prévias e demonstra passagem, pausa, play e retorno à galeria', () => {
    const passos = demonstracaoCenarios.passos(contexto);
    for (const experiencia of EXPERIENCIAS_VISUAIS) {
      expect(passos.some((p) => String(p.alvo).includes(`/demonstracao/${experiencia.id}`))).toBe(
        true,
      );
    }
    expect(passos.some((p) => String(p.alvo).includes('Pausar painel'))).toBe(true);
    expect(passos.some((p) => String(p.alvo).includes('Retomar painel'))).toBe(true);
    expect(passos.filter((p) => p.alvo === '.voltar-galeria')).toHaveLength(6);
    expect(passos.filter((p) => p.alvo === '.etapas')).toHaveLength(6);
  });
});
