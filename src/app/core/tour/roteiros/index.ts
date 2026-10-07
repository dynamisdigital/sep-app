import { Roteiro } from '../tour.model';
import { ROTEIROS_BACKOFFICE } from './backoffice.roteiro';
import { ROTEIROS_CORRESPONDENTES } from './correspondentes.roteiro';
import { ROTEIROS_CREDITO } from './credito.roteiro';
import { ROTEIROS_CREDORA } from './credora.roteiro';
import { ROTEIROS_COBRANCA } from './cobranca.roteiro';
import { ROTEIROS_FORMALIZACAO } from './formalizacao.roteiro';
import { ROTEIROS_ONBOARDING } from './onboarding.roteiro';
import { ROTEIROS_PIX } from './pix.roteiro';
import { ROTEIROS_PARAMETROS } from './parametros.roteiro';
import { ROTEIROS_PLATAFORMA } from './plataforma.roteiro';
import { ROTEIROS_PERFIL } from './perfil.roteiro';
import { ROTEIROS_PUBLICO } from './publico.roteiro';
import { ROTEIROS_USUARIOS } from './usuarios.roteiro';

// Um arquivo por modulo. Para um modulo novo: criar `<modulo>.roteiro.ts` no molde do de
// Usuarios ou do de Credito (os passos de menu e de TOTP estao em `passos-comuns.ts`) e
// acrescentar aqui; o painel de Ajuda agrupa pelo campo `modulo`, na ordem desta lista.
// Ordem do painel: a da jornada do cliente (onboarding, credito) e depois a administracao.
export const ROTEIROS: Roteiro[] = [
  ...ROTEIROS_ONBOARDING,
  ...ROTEIROS_CREDITO,
  ...ROTEIROS_FORMALIZACAO,
  ...ROTEIROS_COBRANCA,
  ...ROTEIROS_PIX,
  ...ROTEIROS_BACKOFFICE,
  ...ROTEIROS_CREDORA,
  ...ROTEIROS_CORRESPONDENTES,
  ...ROTEIROS_USUARIOS,
  ...ROTEIROS_PARAMETROS,
  ...ROTEIROS_PERFIL,
  ...ROTEIROS_PLATAFORMA,
  ...ROTEIROS_PUBLICO,
];

/**
 * Icone e cor de cada modulo no painel de Ajuda. A cor e a do proprio modulo no menu lateral
 * (`--sep-tint-*`, com variante clara e escura), para o painel e o menu falarem a mesma lingua.
 * Parametros sai do vermelho de Administracao, que Usuarios ja usa, para os dois se distinguirem.
 */
export const MODULOS_TOUR: Record<string, { icone: string; tom: string }> = {
  Onboarding: { icone: 'user-plus', tom: 'var(--sep-tint-cyan)' },
  Crédito: { icone: 'credit-card', tom: 'var(--sep-tint-violet)' },
  Formalização: { icone: 'file-check', tom: 'var(--sep-tint-pink)' },
  Cobrança: { icone: 'banknote', tom: 'var(--sep-tint-amber)' },
  Pix: { icone: 'qr-code', tom: 'var(--sep-tint-teal)' },
  Backoffice: { icone: 'briefcase', tom: 'var(--sep-tint-sky)' },
  Credora: { icone: 'building-2', tom: 'var(--sep-tint-emerald)' },
  Correspondentes: { icone: 'handshake', tom: 'var(--sep-tint-lime)' },
  Usuários: { icone: 'users', tom: 'var(--sep-tint-red)' },
  Parâmetros: { icone: 'settings', tom: 'var(--sep-tint-orange)' },
  Perfil: { icone: 'user-round', tom: 'var(--sep-tint-slate)' },
  Plataforma: { icone: 'layout-dashboard', tom: 'var(--sep-glow)' },
  'Site institucional': { icone: 'globe', tom: 'var(--sep-tint-coral)' },
};

export const MODULO_PADRAO = { icone: 'monitor-play', tom: 'var(--sep-glow)' };
