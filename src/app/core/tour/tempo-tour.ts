import { ContextoRoteiro, PassoRoteiro } from './tour.model';

// Estimativa do tempo de um tour, para o cartao mostrar "restante" e "total" e as secoes mostrarem
// quanto dura cada submodulo. E aproximada: o motor espera a fala e a tela, que variam.

/** Milissegundos de fala por caractere na velocidade normal. */
const MS_POR_LETRA_FALA = 62;
/** Rolagem, transicao do cartao e deslocamento do cursor ate o alvo (ver `executarPasso`). */
const MS_ATE_O_ALVO = 1100;
const MS_POR_LETRA_DIGITADA = 70;
const MS_CLIQUE = 220;
const MS_TROCA_DE_TELA = 350;

/** Duracao aproximada de um passo na velocidade dada, em milissegundos. */
export function estimarPasso(passo: PassoRoteiro, ctx: ContextoRoteiro, velocidade = 1): number {
  const texto = typeof passo.texto === 'function' ? passo.texto(ctx) : passo.texto;
  const soObservar = !passo.acao || passo.acao.tipo === 'observar';
  const leitura = Math.max(1600, texto.length * (soObservar ? 42 : 30));
  // A fala e a leitura correm juntas: vale a mais longa.
  const falada = Math.max(leitura, texto.length * MS_POR_LETRA_FALA);
  let acao = 0;
  if (passo.alvo) acao += MS_ATE_O_ALVO;
  if (passo.acao?.tipo === 'digitar') acao += passo.acao.texto(ctx).length * MS_POR_LETRA_DIGITADA;
  if (passo.acao?.tipo === 'clicar') acao += MS_CLIQUE;
  if (passo.aguardarRota) acao += MS_TROCA_DE_TELA;
  return (falada + acao) / Math.max(0.5, velocidade);
}

/** Soma dos passos de `inicio` ate `fim` (exclusivo); os que o contexto pula nao entram. */
export function estimarPassos(
  passos: PassoRoteiro[],
  ctx: ContextoRoteiro,
  velocidade = 1,
  inicio = 0,
  fim?: number,
): number {
  return passos
    .slice(inicio, fim)
    .filter((p) => !p.pularSe?.(ctx))
    .reduce((soma, p) => soma + estimarPasso(p, ctx, velocidade), 0);
}

/** "≈ 45 s", "≈ 3 min", "≈ 6 min 20 s": arredondado, para quem escolhe o que assistir. */
export function formatarEstimativa(ms: number): string {
  const segundos = Math.max(0, ms) / 1000;
  if (segundos < 55) return `≈ ${Math.max(5, Math.round(segundos / 5) * 5)} s`;
  const passo = segundos >= 300 ? 10 : 5;
  const total = Math.round(segundos / passo) * passo;
  const min = Math.floor(total / 60);
  const resto = total % 60;
  return `≈ ${min} min${resto ? ` ${resto} s` : ''}`;
}

/** Tempo corrido exato: "45 s" ou "6 min 05 s". */
export function formatarRelogio(ms: number): string {
  const segundos = Math.round(Math.max(0, ms) / 1000);
  return segundos < 60
    ? `${segundos} s`
    : `${Math.floor(segundos / 60)} min ${String(segundos % 60).padStart(2, '0')} s`;
}
