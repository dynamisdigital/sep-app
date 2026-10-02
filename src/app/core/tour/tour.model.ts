import { UsuarioRole } from '../api/api.models';

// Tours assistidos: roteiros que o proprio sistema executa na tela, como se um operador estivesse
// usando. Cada passo aponta um elemento, explica o que ele faz e, se for o caso, age sobre ele
// (clica, digita). O motor esta em `tour.service.ts`; os roteiros ficam em `roteiros/`, um
// arquivo por modulo, para o piloto de Usuarios servir de molde aos demais.

/** Elemento-alvo: seletor CSS e, quando o seletor nao basta, o texto visivel que o distingue. */
export type AlvoPasso = string | { css: string; texto: string };

export type AcaoPasso =
  /** So destaca e explica. */
  | { tipo: 'observar' }
  /**
   * Clica no alvo. `efeito: true` marca um clique que grava dados (criar, salvar, confirmar):
   * fora do ambiente de demonstracao ele e so apontado, e o roteiro para ali.
   */
  | { tipo: 'clicar'; efeito?: boolean }
  /** Digita no campo, letra por letra, disparando os mesmos eventos de um teclado. */
  | { tipo: 'digitar'; texto: (ctx: ContextoRoteiro) => string; limpar?: boolean }
  /**
   * Escolhe uma opcao de um `<select>`, pelo texto que aparece na lista (ou pelo `value`). O motor
   * nao abre a lista nativa: ela e desenhada pelo navegador, fora da pagina. Mostra o campo em
   * foco e troca o valor, como o teclado faria.
   */
  | { tipo: 'selecionar'; opcao: string }
  /**
   * Anexa um arquivo de demonstracao a um `<input type="file">`, como o navegador faria depois do
   * seletor (que e uma janela do sistema, fora da pagina e fora do alcance do roteiro). O arquivo
   * nasce na hora, minusculo e sem dado real. So anexar nao envia nada: o envio e o clique seguinte,
   * que leva `efeito: true`. Servir tambem para mostrar a recusa de um formato proibido.
   */
  | { tipo: 'anexar'; nome: string; tipoMime: string };

export interface PassoRoteiro {
  titulo: string;
  /** O que a narracao fala e o cartao mostra. Funcao quando depende do contexto. */
  texto: string | ((ctx: ContextoRoteiro) => string);
  alvo?: AlvoPasso;
  acao?: AcaoPasso;
  /** Depois da acao, espera a URL casar com este padrao (troca de tela). */
  aguardarRota?: RegExp;
  /** Depois da acao, espera este elemento aparecer (resposta do backend, painel que abre). */
  aguardarAlvo?: AlvoPasso;
  /** Pula o passo quando a condicao ja estiver satisfeita (chip que ja esta marcado). */
  pularSe?: (ctx: ContextoRoteiro) => boolean;
}

export interface Roteiro {
  id: string;
  /** Agrupamento no painel de Ajuda. */
  modulo: string;
  titulo: string;
  /** Icone lucide do item no painel de Ajuda. Um por roteiro: o olho reconhece o assunto antes de ler. */
  icone: string;
  descricao: string;
  /** Duracao aproximada na velocidade normal, para quem escolhe o que assistir. */
  duracao: string;
  papeis: UsuarioRole[];
  /** Condicao para o roteiro rodar; devolve o motivo quando nao pode. */
  impedimento?: (ctx: ContextoRoteiro) => string | null;
  /** Monta os passos na hora de iniciar: alguns dependem da conta e do momento. */
  passos: (ctx: ContextoRoteiro) => PassoRoteiro[];
}

/** O que o roteiro sabe sobre a sessao e o que guardou entre passos. */
export interface ContextoRoteiro {
  demo: boolean;
  papel: UsuarioRole | null;
  mfa: boolean;
  /** E-mail da conta logada; roteiros de demonstracao que dependem de uma persona do mock o usam. */
  usuario?: string | null;
  /** Carimbo unico da execucao, para dados de exemplo nao colidirem entre rodadas. */
  carimbo: string;
  dados: Record<string, string>;
}
