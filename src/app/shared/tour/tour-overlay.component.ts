import {
  ChangeDetectionStrategy,
  Component,
  NgZone,
  OnDestroy,
  computed,
  effect,
  ElementRef,
  viewChild,
  inject,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

import { MusicaService } from '../../core/tour/musica.service';
import { NarradorService } from '../../core/tour/narrador.service';
import { TourService } from '../../core/tour/tour.service';

const MARGEM = 24;
// Abaixo do cabecalho do shell: no alto, o cartao nao cobre a pesquisa, os alertas e a ajuda.
const TOPO_LIVRE = 92;
const FOLGA = 20;
// Folga minima entre o cartao e a borda da janela quando ela e menor que o cartao.
const MARGEM_MINIMA = 8;

interface Caixa {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Camada visual dos tours assistidos: escurece a tela, acende o alvo com glow, mostra o cursor
 * simulado e o cartao de controle. Fica em `app.html`, fora do shell, para atravessar as trocas
 * de tela. Sem encapsulamento: a classe de destaque vai no proprio elemento da pagina.
 */
@Component({
  selector: 'sep-tour-overlay',
  imports: [LucideAngularModule],
  templateUrl: './tour-overlay.component.html',
  styleUrl: './tour-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '(document:keydown.escape)': 'sair()',
    '(window:resize)': 'medirJanela()',
  },
})
export class TourOverlayComponent implements OnDestroy {
  protected readonly tour = inject(TourService);
  protected readonly narrador = inject(NarradorService);
  protected readonly musica = inject(MusicaService);
  private readonly zone = inject(NgZone);

  protected readonly caixa = signal<Caixa | null>(null);
  private quadro = 0;

  protected readonly progresso = computed(() => {
    const total = this.tour.passos().length;
    return total ? ((this.tour.indice() + 1) / total) * 100 : 0;
  });

  private readonly cartao = viewChild<ElementRef<HTMLElement>>('cartao');
  // Tamanho real do cartao: o texto de cada passo muda a altura, e o canto e recalculado com ela.
  private readonly tamanhoCartao = signal({ largura: 430, altura: 240 });
  private observador: ResizeObserver | null = null;
  // Tamanho da janela como sinal: ao maximizar ou restaurar, o cartao e recolocado dentro da area visivel.
  private readonly janela = signal({ largura: window.innerWidth, altura: window.innerHeight });

  /**
   * Canto do cartao de controle: dos quatro, o que menos cobre o proximo alvo (com folga de 20px).
   * Le `areaAlvo`, publicada pelo motor antes do destaque, para o cartao sair da frente antes de
   * a area acender. Empate fica no canto de sempre, inferior direito, para o cartao nao saltar.
   */
  protected readonly posicaoCartao = computed(() => {
    const alvo = this.tour.areaAlvo();
    const { largura, altura } = this.tamanhoCartao();
    const { largura: vw, altura: vh } = this.janela();
    // Nunca fora da janela: em janela menor que o cartao, ele encosta na margem em vez de sumir.
    const dentroX = (x: number) =>
      Math.max(MARGEM_MINIMA, Math.min(x, vw - largura - MARGEM_MINIMA));
    const dentroY = (y: number) =>
      Math.max(MARGEM_MINIMA, Math.min(y, vh - altura - MARGEM_MINIMA));
    const cantos = [
      { top: dentroY(vh - altura - MARGEM), left: dentroX(vw - largura - MARGEM) },
      { top: dentroY(vh - altura - MARGEM), left: dentroX(MARGEM) },
      { top: dentroY(TOPO_LIVRE), left: dentroX(vw - largura - MARGEM) },
      { top: dentroY(TOPO_LIVRE), left: dentroX(MARGEM) },
    ];
    if (!alvo) return cantos[0];
    const area = {
      top: alvo.top - FOLGA,
      left: alvo.left - FOLGA,
      bottom: alvo.bottom + FOLGA,
      right: alvo.right + FOLGA,
    };
    let melhor = cantos[0];
    let menor = Infinity;
    for (const canto of cantos) {
      const sobra =
        Math.max(0, Math.min(canto.left + largura, area.right) - Math.max(canto.left, area.left)) *
        Math.max(0, Math.min(canto.top + altura, area.bottom) - Math.max(canto.top, area.top));
      if (sobra < menor) {
        menor = sobra;
        melhor = canto;
      }
    }
    return melhor;
  });

  constructor() {
    effect(() => {
      const el = this.cartao()?.nativeElement;
      this.observador?.disconnect();
      if (!el || typeof ResizeObserver === 'undefined') return;
      this.observador = new ResizeObserver(() =>
        this.zone.run(() =>
          this.tamanhoCartao.set({ largura: el.offsetWidth, altura: el.offsetHeight }),
        ),
      );
      this.observador.observe(el);
    });
    // Acompanha o alvo enquanto o roteiro roda: rolagem, animacao e reflow mudam a posicao.
    // O laco corre fora da zona e so entra nela quando a caixa muda de fato.
    effect(() => {
      if (this.tour.ativo()) this.zone.runOutsideAngular(() => this.acompanhar());
      else {
        cancelAnimationFrame(this.quadro);
        this.caixa.set(null);
      }
    });
  }

  private acompanhar(): void {
    cancelAnimationFrame(this.quadro);
    const passo = () => {
      const el = this.tour.elemento();
      const r = el?.isConnected ? el.getBoundingClientRect() : null;
      const atual = this.caixa();
      const nova = r ? { top: r.top, left: r.left, width: r.width, height: r.height } : null;
      if (!mesmaCaixa(atual, nova)) this.zone.run(() => this.caixa.set(nova));
      if (this.tour.ativo()) this.quadro = requestAnimationFrame(passo);
    };
    this.quadro = requestAnimationFrame(passo);
  }

  /** A janela mudou de tamanho (maximizar, meia tela): recalcula onde o cartao cabe. */
  protected medirJanela(): void {
    this.janela.set({ largura: window.innerWidth, altura: window.innerHeight });
    // O layout se refaz com a janela: depois do reflow, a area do alvo e medida de novo, para o canto
    // do cartao ser escolhido com a posicao nova do destaque.
    requestAnimationFrame(() => {
      const el = this.tour.elemento();
      if (el?.isConnected) this.tour.areaAlvo.set(el.getBoundingClientRect());
    });
  }

  protected sair(): void {
    if (this.tour.ativo()) this.tour.encerrar();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.quadro);
    this.observador?.disconnect();
  }
}

function mesmaCaixa(a: Caixa | null, b: Caixa | null): boolean {
  if (!a || !b) return a === b;
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}
