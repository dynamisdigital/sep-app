import { afterNextRender, Directive, ElementRef, inject, input, OnDestroy } from '@angular/core';

export type LadoDeEntrada = 'esquerda' | 'direita' | 'topo' | 'base' | 'escala';

/**
 * Entrada em cena: o bloco chega de um dos lados quando aparece na tela, o mesmo efeito que a página
 * inicial usa na abertura (`sep-enter-left`, `-right`, `-top`, `-bottom`). As páginas internas
 * combinam lados diferentes, para o texto parecer montar-se de vários cantos. O estilo fica no shell
 * público (`.sep-entrada`); a diretiva só decide quando o bloco entra.
 *
 * Sem `IntersectionObserver` ou com `prefers-reduced-motion`, o bloco aparece parado, já no lugar.
 */
@Directive({
  selector: '[sepEntrada]',
  host: {
    class: 'sep-entrada',
    '[attr.data-lado]': 'sepEntrada()',
    '[style.--entrada-atraso]': 'entradaAtraso() + "ms"',
  },
})
export class EntradaDirective implements OnDestroy {
  readonly sepEntrada = input<LadoDeEntrada | ''>('base');
  /** Atraso da animação, em ms, para os itens de uma lista chegarem em sequência. */
  readonly entradaAtraso = input<number>(0);

  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private observador: IntersectionObserver | null = null;

  constructor() {
    afterNextRender(() => {
      const el = this.elemento;
      const semMovimento =
        typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (semMovimento || typeof IntersectionObserver === 'undefined') {
        el.classList.add('sep-entrou');
        return;
      }
      try {
        this.observador = new IntersectionObserver(
          (entradas) => {
            if (entradas.some((e) => e.isIntersecting)) {
              el.classList.add('sep-entrou');
              this.observador?.disconnect?.();
            }
          },
          { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
        );
        this.observador.observe(el);
      } catch {
        // Ambiente sem observador de verdade (testes, navegadores antigos): o bloco aparece parado.
        el.classList.add('sep-entrou');
      }
    });
  }

  ngOnDestroy(): void {
    this.observador?.disconnect?.();
  }
}
