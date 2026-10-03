import { AlvoPasso, ContextoRoteiro, PassoRoteiro, Roteiro } from '../tour.model';

// Passos que todo modulo repete: abrir o menu, chegar a uma tela pelo menu lateral e confirmar uma
// operacao sensivel por TOTP. Ficam aqui para um roteiro novo descrever so o que e proprio dele.

/** Codigo aceito pelo step-up do mock. Os roteiros so enviam dados no ambiente de demonstracao. */
export const CODIGO_TOTP_DEMO = '123456';

export const ROTA_STEP_UP = /^\/app\/step-up/;

/** Casa a rota exata, com ou sem query string (`?status=...`). */
export function rotaExata(rota: string): RegExp {
  return new RegExp(`^${rota.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(\\?.*)?$`);
}

/** Um clique no menu lateral: para onde vai, o que o operador ouve e o que prova que chegou. */
export interface EtapaMenu {
  rota: string;
  titulo: string;
  texto: string;
  /** Padrao da URL ao chegar. Por padrao, a propria rota. */
  chegada?: RegExp;
  /** Elemento que so existe com a tela pronta (dados carregados). */
  aguardarAlvo?: AlvoPasso;
  /** Seletor quando o item nao e `op-nav-link` (grupo) nem `op-subnav-link` (submenu). */
  css?: string;
}

/** Abre o menu quando ele esta recolhido a uma barra de icones; senao, nao faz nada. */
export function abrirMenu(): PassoRoteiro {
  return {
    titulo: 'Abrir o menu',
    texto: 'O menu está recolhido. Primeiro, ele é aberto para mostrar os submenus.',
    alvo: '.op-menu-button',
    acao: { tipo: 'clicar' },
    pularSe: () => !document.querySelector('.op-sidebar-colapsada'),
  };
}

/**
 * Do ponto em que estiver ate uma tela, clicando no menu como faria um operador: o grupo e, se
 * houver, o submenu. O clique no grupo ja abre a tela inicial do modulo.
 */
export function peloMenu(grupo: EtapaMenu, sub?: EtapaMenu): PassoRoteiro[] {
  const passo = (etapa: EtapaMenu, padrao: string): PassoRoteiro => ({
    titulo: etapa.titulo,
    texto: etapa.texto,
    alvo: etapa.css ?? `${padrao}[href="${etapa.rota}"]`,
    acao: { tipo: 'clicar' },
    aguardarRota: etapa.chegada ?? rotaExata(etapa.rota),
    aguardarAlvo: etapa.aguardarAlvo,
  });
  return [
    abrirMenu(),
    passo(grupo, 'a.op-nav-link'),
    ...(sub ? [passo(sub, 'a.op-subnav-link')] : []),
  ];
}

/**
 * Confirmacao adicional por TOTP, comum a toda operacao sensivel. Parte da tela de confirmacao
 * (o clique que gravou ja mandou para la) e termina de volta na tela de origem.
 */
export function confirmarComTotp(opcoes: {
  /** Por que a operacao pede a segunda confirmacao. */
  motivo: string;
  /** O que acontece depois de confirmar. */
  aoConfirmar: string;
  /** Tela para a qual o sistema volta. */
  destino: RegExp;
}): PassoRoteiro[] {
  return [
    {
      titulo: 'Confirmação adicional',
      texto: opcoes.motivo,
      alvo: { css: 'button', texto: 'Iniciar confirmação' },
      acao: { tipo: 'clicar' },
      aguardarAlvo: '[data-testid="sep-step-up-input"]',
    },
    {
      titulo: 'Código do autenticador',
      texto: 'Aqui entra o código de seis dígitos do aplicativo autenticador.',
      alvo: '[data-testid="sep-step-up-input"]',
      acao: { tipo: 'digitar', texto: () => CODIGO_TOTP_DEMO },
    },
    {
      titulo: 'Confirmar',
      texto: opcoes.aoConfirmar,
      alvo: { css: 'button[type="submit"]', texto: 'Confirmar' },
      acao: { tipo: 'clicar', efeito: true },
      aguardarRota: opcoes.destino,
    },
  ];
}

/**
 * Passos de um sub-roteiro como uma secao do "Modulo completo". O primeiro roteiro entra inteiro; os
 * seguintes sem a apresentacao do inicio (`primeira: false` e o padrao). `manter` filtra os passos
 * que a secao anterior ja deixou prontos. O que ficou de fora antes do primeiro passo mantido e que
 * age na tela (cliques de menu) vira `entrada`: roda se o operador saltar direto para esta secao.
 */
export function emSecao(
  roteiro: Roteiro,
  ctx: ContextoRoteiro,
  opcoes: { primeira?: boolean; manter?: (passo: PassoRoteiro) => boolean } = {},
): PassoRoteiro[] {
  const todos = roteiro.passos(ctx);
  const mantidos = (opcoes.primeira ? todos : todos.slice(1)).filter(opcoes.manter ?? (() => true));
  const primeiro = mantidos[0] ? todos.indexOf(mantidos[0]) : -1;
  const entrada =
    primeiro > 0
      ? todos.slice(0, primeiro).filter((p) => p.acao && p.acao.tipo !== 'observar')
      : [];
  return mantidos.map((passo, i) => ({
    ...passo,
    secao: roteiro.titulo,
    ...(i === 0 && entrada.length ? { entrada } : {}),
  }));
}
