import { Injectable, OnDestroy, signal } from '@angular/core';

export type LarguraTela = 'ajustada' | 'expandida';

/** Largura de CSS de uma meia tela num monitor de 2559px com zoom de 75%. Espelha `_largura-tela.scss`. */
export const JANELA_MEIA_TELA_PX = 1716;

const CHAVE = 'SEP_LARGURA_CONTEUDO';

/**
 * Largura da tela em janela maximizada (acima de `JANELA_MEIA_TELA_PX`). `ajustada` mantem a tela no
 * tamanho de meia tela, centralizada; `expandida` a deixa ocupar a janela inteira. Uma escolha so,
 * guardada no navegador, vale para o sistema logado e para o site publico.
 */
@Injectable({ providedIn: 'root' })
export class LarguraTelaService implements OnDestroy {
  private readonly consulta =
    typeof window.matchMedia === 'function'
      ? window.matchMedia(`(width > ${JANELA_MEIA_TELA_PX}px)`)
      : null;

  readonly largura = signal<LarguraTela>(lerPreferencia());
  /** So em janela maximizada a escolha muda alguma coisa; abaixo disso o botao nem aparece. */
  readonly janelaMaximizada = signal(this.consulta?.matches ?? false);

  private readonly aoMudarJanela = (e: MediaQueryListEvent): void =>
    this.janelaMaximizada.set(e.matches);

  constructor() {
    this.consulta?.addEventListener('change', this.aoMudarJanela);
  }

  alternar(): void {
    const proxima: LarguraTela = this.largura() === 'ajustada' ? 'expandida' : 'ajustada';
    this.largura.set(proxima);
    try {
      window.localStorage.setItem(CHAVE, proxima);
    } catch {
      // Armazenamento bloqueado: a escolha vale so ate recarregar a pagina.
    }
  }

  ngOnDestroy(): void {
    this.consulta?.removeEventListener('change', this.aoMudarJanela);
  }
}

function lerPreferencia(): LarguraTela {
  try {
    return window.localStorage.getItem(CHAVE) === 'expandida' ? 'expandida' : 'ajustada';
  } catch {
    return 'ajustada';
  }
}
