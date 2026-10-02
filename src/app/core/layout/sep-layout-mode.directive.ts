/**
 * SEP — Frontend
 *
 * Frontend Development:
 * Daniel Möllmann
 *
 * Angular • TypeScript • SCSS
 * 2026
 */

import {
  Directive,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';

import { SepLayoutMode, SepLayoutModeInput, sepModoPorLargura } from './sep-layout-mode';

/**
 * Publica o modo de apresentação do elemento como atributo `data-sep-modo`, para o CSS, e como
 * signal, para quem precisar dele em código.
 *
 * **Quando NÃO usar:** se a reorganização é puramente visual, o CSS resolve sozinho com os mixins
 * de `styles/_sep-responsivo.scss`, sem custo de JavaScript. Esta diretiva é para o caso em que a
 * decisão muda o *comportamento* — quantas colunas de tabela consultar, se a ação vai para um
 * menu, quantos itens carregar.
 *
 * Uma única implementação de `ResizeObserver` para todo o produto: nada de listener de resize por
 * componente, nada de `window.innerWidth` espalhado.
 *
 * Precedência: **override explícito vence o modo automático**.
 *
 *     <section sepLayoutMode>              <!-- mede o próprio espaço -->
 *     <section sepLayoutMode="third">      <!-- forçado, útil em demonstração e captura -->
 */
@Directive({
  selector: '[sepLayoutMode]',
  exportAs: 'sepLayoutMode',
  host: {
    '[attr.data-sep-modo]': 'modo()',
  },
})
export class SepLayoutModeDirective implements OnDestroy {
  /** `auto` mede o espaço; qualquer outro valor força o modo. */
  readonly sepLayoutMode = input<SepLayoutModeInput | ''>('auto');

  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly medido = signal<SepLayoutMode>('full');
  private observador: ResizeObserver | null = null;

  /** O modo em vigor, já resolvida a precedência. */
  readonly modo = computed<SepLayoutMode>(() => {
    const declarado = this.sepLayoutMode();
    if (declarado && declarado !== 'auto') return declarado;
    return this.medido();
  });

  constructor() {
    effect((aoDestruir) => {
      // Só observa quando o modo é automático: com override, medir seria trabalho jogado fora.
      const declarado = this.sepLayoutMode();
      if (declarado && declarado !== 'auto') {
        this.desligar();
        return;
      }
      const alvo = this.elemento.nativeElement;
      this.medido.set(sepModoPorLargura(alvo.getBoundingClientRect().width));
      try {
        const observador = new ResizeObserver((entradas) => {
          for (const entrada of entradas) {
            const largura = entrada.contentRect.width;
            // `set` num signal com o mesmo valor não dispara ciclo; não é preciso comparar antes.
            this.medido.set(sepModoPorLargura(largura));
          }
        });
        observador.observe(alvo);
        this.observador = observador;
      } catch {
        // Ambiente sem ResizeObserver funcional: fica no modo medido na entrada.
      }
      aoDestruir(() => this.desligar());
    });
  }

  ngOnDestroy(): void {
    this.desligar();
  }

  private desligar(): void {
    this.observador?.disconnect();
    this.observador = null;
  }
}
