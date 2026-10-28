// SEP — Frontend
// Frontend Development: Daniel Möllmann
// Angular • TypeScript — 2026

import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';

import { PIX_COR, PIX_LOGO_PATH } from './pix-logo';

/**
 * Arte HUD vetorial: os desenhos que os Mockups entregaram como PNG sobre fundo escuro.
 *
 * Em bitmap eles serrilhavam (a tela os mostrava ampliados de 1,06x a 1,73x) e carregavam o fundo
 * da tela escura para o tema claro. Aqui cada um e um SVG de traco em `currentColor`: fica nitido
 * em qualquer tamanho, e transparente de verdade sobre o widget. A cor sai dos tokens de grafico e
 * o brilho neon so existe no tema escuro.
 */

export type NomeArte =
  | 'escudo-rodape'
  | 'escudo-heroi'
  | 'calendario'
  | 'cadeado-senha'
  | 'escudo-regulado'
  | 'empresa'
  | 'pessoa'
  | 'documento-proposta'
  | 'cadeado'
  | 'escudo-check'
  | 'escudo-aprovado'
  | 'engrenagem'
  | 'escudo-monitorado'
  | 'headset'
  | 'escudo-pix'
  | 'pasta-alerta'
  | 'prancheta'
  | 'pix';

export type TomArte = 'azul' | 'ciano' | 'verde' | 'vermelho';

/** Caixa de desenho de cada arte, na proporcao do PNG que ela substitui. */
const CAIXA: Record<NomeArte, readonly [number, number]> = {
  'escudo-rodape': [120, 80],
  'escudo-heroi': [170, 130],
  calendario: [80, 56],
  'cadeado-senha': [90, 130],
  'escudo-regulado': [170, 125],
  empresa: [180, 180],
  pessoa: [196, 184],
  'documento-proposta': [300, 185],
  cadeado: [120, 150],
  'escudo-check': [100, 100],
  'escudo-aprovado': [46, 60],
  engrenagem: [84, 84],
  'escudo-monitorado': [34, 52],
  headset: [92, 96],
  'escudo-pix': [62, 66],
  'pasta-alerta': [260, 180],
  prancheta: [190, 182],
  pix: [48, 48],
};

const TOM_PADRAO: Record<NomeArte, TomArte> = {
  'escudo-rodape': 'azul',
  'escudo-heroi': 'azul',
  calendario: 'azul',
  'cadeado-senha': 'azul',
  'escudo-regulado': 'azul',
  empresa: 'azul',
  pessoa: 'verde',
  'documento-proposta': 'ciano',
  cadeado: 'ciano',
  'escudo-check': 'ciano',
  'escudo-aprovado': 'verde',
  engrenagem: 'azul',
  'escudo-monitorado': 'verde',
  headset: 'azul',
  'escudo-pix': 'verde',
  'pasta-alerta': 'vermelho',
  prancheta: 'ciano',
  pix: 'verde',
};

const r = (n: number): number => Math.round(n * 10) / 10;

/** Contorno de escudo com topo em `y`, centrado em `cx`. */
function escudo(cx: number, y: number, w: number, h: number): string {
  const x0 = r(cx - w / 2);
  const x1 = r(cx + w / 2);
  return (
    `M${cx} ${y}L${x1} ${r(y + h * 0.16)}V${r(y + h * 0.46)}` +
    `C${x1} ${r(y + h * 0.74)} ${r(cx + w * 0.2)} ${r(y + h * 0.92)} ${cx} ${r(y + h)}` +
    `C${r(cx - w * 0.2)} ${r(y + h * 0.92)} ${x0} ${r(y + h * 0.74)} ${x0} ${r(y + h * 0.46)}` +
    `V${r(y + h * 0.16)}Z`
  );
}

const D = {
  rodape: escudo(60, 22, 26, 34),
  heroiExterno: escudo(85, 6, 104, 100),
  heroiInterno: escudo(85, 14, 88, 86),
  heroiNucleo: escudo(80, 32, 44, 46),
  reguladoExterno: escudo(85, 6, 70, 86),
  reguladoInterno: escudo(85, 15, 54, 70),
  checkExterno: escudo(50, 6, 68, 86),
  checkInterno: escudo(50, 15, 52, 68),
  aprovado: escudo(30, 14, 26, 32),
  monitorado: escudo(20, 10, 24, 28),
  pix: escudo(31, 4, 50, 58),
} as const;

@Component({
  selector: 'sep-arte',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[attr.data-tom]': 'tomFinal()',
    '[style.aspect-ratio]': 'proporcao()',
  },
  template: `
    <svg [attr.viewBox]="caixa()" preserveAspectRatio="xMidYMid meet" focusable="false">
      <g [attr.transform]="centro()">
        @switch (nome()) {
          @case ('escudo-rodape') {
            <circle cx="60" cy="40" r="36" class="fino tracejado" />
            <circle cx="60" cy="40" r="26" class="fino" />
            <path d="M60 2v7M60 71v7M18 40h7M95 40h7" class="fino" />
            <path [attr.d]="d.rodape" class="preenchido" stroke-width="1.8" />
            <path d="M53.5 39.5l4.5 4.5 8.5-8.5" stroke-width="2" />
          }
          @case ('escudo-heroi') {
            <ellipse cx="85" cy="110" rx="80" ry="16" class="fino" />
            <ellipse cx="85" cy="110" rx="58" ry="11" class="fino tracejado" />
            <ellipse cx="85" cy="110" rx="34" ry="6" stroke-width="1.2" />
            <path [attr.d]="d.heroiExterno" stroke-width="2.2" />
            <path [attr.d]="d.heroiInterno" class="fino" />
            <path [attr.d]="d.heroiNucleo" class="preenchido" stroke-width="1.6" />
            <path d="M80 44v22M69 55h22M73 48l14 14M87 48l-14 14" stroke-width="1" opacity=".75" />
            <circle cx="80" cy="55" r="2.6" class="solido" />
          }
          @case ('calendario') {
            <circle cx="8" cy="30" r="1.5" class="solido" />
            <rect x="26" y="10" width="40" height="40" rx="5" stroke-width="2" />
            <path d="M26 20h40M36 5v9M56 5v9" stroke-width="2" />
            <path
              d="M33 27h7v5h-7zM43 27h7v5h-7zM53 27h7v5h-7zM33 37h7v5h-7zM43 37h7v5h-7z"
              stroke-width="1.5"
            />
          }
          @case ('cadeado-senha') {
            <rect x="27" y="52" width="36" height="32" rx="4" class="preenchido" stroke-width="2" />
            <path d="M34 52V42a11 11 0 0 1 22 0v10" stroke-width="2" />
            <circle cx="45" cy="65" r="3.5" stroke-width="1.8" />
            <path d="M45 68.5v6" stroke-width="1.8" />
            <path d="M20 44l6 3M64 104l8 4" class="fino" />
            <circle cx="8" cy="12" r="1.4" class="solido" />
            <circle cx="38" cy="26" r="1.4" class="solido" />
            <circle cx="84" cy="40" r="1.4" class="solido" />
            <circle cx="80" cy="72" r="1.4" class="solido" />
            <circle cx="72" cy="98" r="1.4" class="solido" />
            <circle cx="14" cy="108" r="1.4" class="solido" />
            <circle cx="40" cy="122" r="1.4" class="solido" />
          }
          @case ('escudo-regulado') {
            <ellipse cx="85" cy="102" rx="80" ry="15" class="fino tracejado" />
            <ellipse cx="85" cy="102" rx="56" ry="10" class="fino" />
            <ellipse cx="85" cy="102" rx="32" ry="5.5" stroke-width="1.2" />
            <path d="M8 40h9M150 48h11M20 70h5M142 76h7" class="fino" />
            <path [attr.d]="d.reguladoExterno" class="preenchido" stroke-width="2.4" />
            <path [attr.d]="d.reguladoInterno" stroke-width="1.2" opacity=".7" />
            <path d="M85 22v18M85 56v26M62 48h15M93 48h15" class="fino" />
            <circle cx="85" cy="48" r="8" class="preenchido forte" stroke-width="1.8" />
          }
          @case ('empresa') {
            <circle cx="90" cy="90" r="84" class="fino tracejado" />
            <circle cx="90" cy="90" r="62" class="fino" />
            <path d="M20 66A74 74 0 0 1 112 18" stroke-width="2.5" opacity=".8" />
            <circle cx="12" cy="104" r="1.4" class="solido" />
            <circle cx="170" cy="72" r="1.4" class="solido" />
            <circle cx="150" cy="160" r="1.4" class="solido" />
            <path d="M60 122h64M68 122V60l26-10v72M94 76h22v46M78 122v-12h8v12" stroke-width="2" />
            <path
              d="M74 66h5v6h-5zM84 66h5v6h-5zM74 78h5v6h-5zM84 78h5v6h-5zM74 90h5v6h-5zM84 90h5v6h-5zM100 84h4v6h-4zM108 84h4v6h-4zM100 96h4v6h-4zM108 96h4v6h-4z"
              stroke-width="1.4"
            />
            <circle cx="124" cy="120" r="15" class="solido" />
            <path d="M117 120l5 5 9-10" class="sobre-solido" stroke-width="2.6" />
          }
          @case ('pessoa') {
            <circle cx="98" cy="92" r="86" class="fino tracejado" />
            <circle cx="98" cy="92" r="62" class="fino" />
            <path d="M26 66A76 76 0 0 1 120 18" stroke-width="2.5" opacity=".8" />
            <circle cx="14" cy="112" r="1.4" class="solido" />
            <circle cx="184" cy="76" r="1.4" class="solido" />
            <circle cx="160" cy="164" r="1.4" class="solido" />
            <circle cx="98" cy="74" r="14" stroke-width="2.4" />
            <path
              d="M70 124v-6c0-12 10-20 22-20h12c12 0 22 8 22 20v6zM90 99l8 9 8-9"
              class="preenchido"
              stroke-width="2.4"
            />
            <circle cx="130" cy="122" r="15" class="solido" />
            <path d="M123 122l5 5 9-10" class="sobre-solido" stroke-width="2.6" />
          }
          @case ('documento-proposta') {
            <ellipse cx="150" cy="150" rx="140" ry="26" class="fino" />
            <ellipse cx="150" cy="150" rx="100" ry="18" class="fino tracejado" />
            <ellipse cx="150" cy="150" rx="64" ry="11" stroke-width="1.5" />
            <ellipse cx="150" cy="150" rx="40" ry="7" class="preenchido" stroke-width="1" />
            <path d="M150 158v24" class="fino tracejado" />
            <path d="M110 12h62l22 22v106h-84z" class="preenchido" stroke-width="2" />
            <path d="M172 12v22h22" stroke-width="2" />
            <rect x="120" y="34" width="50" height="8" rx="1" stroke-width="1.5" />
            <path
              d="M120 56h40M120 66h30M120 80h44M120 92h34M120 110h60M120 120h50"
              class="linha"
            />
            <path
              d="M188 64c-2-3-5-4-9-4-5 0-8 2.5-8 6 0 8 17 5 17 13 0 4-4 6.5-9 6.5-4 0-7.5-1.5-9.5-4.5M179 55v35"
              stroke-width="2.2"
            />
            <circle cx="20" cy="96" r="1.4" class="solido" />
            <circle cx="280" cy="104" r="1.4" class="solido" />
          }
          @case ('cadeado') {
            <circle cx="60" cy="96" r="54" class="fino tracejado" />
            <path d="M34 64V44a26 26 0 0 1 52 0v20" stroke-width="4" />
            <rect x="20" y="64" width="80" height="66" rx="8" class="preenchido" stroke-width="3" />
            <path d="M60 84a8 8 0 0 0-4 15l-2 13h12l-2-13a8 8 0 0 0-4-15z" stroke-width="2.5" />
            <path d="M60 138v8" class="fino" />
          }
          @case ('escudo-check') {
            <path [attr.d]="d.checkExterno" stroke-width="2.4" />
            <path [attr.d]="d.checkInterno" class="preenchido" stroke-width="1.4" />
            <path d="M38 49l9 9 16-18" stroke-width="3" />
          }
          @case ('escudo-aprovado') {
            <path d="M16 4A28 28 0 0 0 16 56" class="fino" />
            <path [attr.d]="d.aprovado" class="preenchido" stroke-width="2" />
            <path d="M24 30l4.5 4.5L37 26" stroke-width="2.2" />
          }
          @case ('engrenagem') {
            <circle cx="42" cy="42" r="36" stroke-width="2" />
            <path d="M42 2v5M42 77v5M2 42h5M77 42h5" stroke-width="1.5" />
            <path d="M6 4v14" class="fino" />
            @for (a of dentes; track a) {
              <path d="M42 22.5v5" class="dente" [attr.transform]="'rotate(' + a + ' 42 42)'" />
            }
            <circle cx="42" cy="42" r="11.5" class="preenchido" stroke-width="2" />
            <circle cx="42" cy="42" r="4.5" stroke-width="2" />
          }
          @case ('escudo-monitorado') {
            <path d="M4 38a22 22 0 0 0 26 10" class="fino" />
            <path [attr.d]="d.monitorado" class="solido" />
            <path d="M14.5 23.5l4 4 7.5-7.5" class="sobre-solido" stroke-width="2.2" />
          }
          @case ('headset') {
            <path d="M70 8a44 44 0 0 1 16 40M64 90a44 44 0 0 0 22-30" class="fino" />
            <path d="M20 52v-8a26 26 0 0 1 52 0v8" stroke-width="3" />
            <rect
              x="12"
              y="48"
              width="12"
              height="22"
              rx="5"
              class="preenchido"
              stroke-width="2.5"
            />
            <rect
              x="68"
              y="48"
              width="12"
              height="22"
              rx="5"
              class="preenchido"
              stroke-width="2.5"
            />
            <path d="M74 70v4a12 12 0 0 1-12 12h-8" stroke-width="2.5" />
            <rect x="42" y="82" width="12" height="8" rx="4" class="preenchido" stroke-width="2" />
          }
          @case ('escudo-pix') {
            <path [attr.d]="d.pix" class="preenchido" stroke-width="2.4" />
            <path d="M20 34l8 8 15-16" stroke-width="3" />
          }
          @case ('pasta-alerta') {
            <ellipse cx="130" cy="152" rx="120" ry="16" stroke-width="1.5" opacity=".8" />
            <path d="M82 66V10h54l20 20v36M136 10v20h20" stroke-width="1.6" />
            <path d="M96 34h26" class="fino" />
            <path
              d="M60 76a8 8 0 0 1 8-8h32l8 8h78a8 8 0 0 1 8 8v58a8 8 0 0 1-8 8H68a8 8 0 0 1-8-8z"
              class="preenchido"
              stroke-width="2"
            />
            <circle cx="130" cy="108" r="18" stroke-width="2" />
            <path d="M130 98v11" stroke-width="3" />
            <circle cx="130" cy="117" r="1.9" class="solido" />
            <circle cx="24" cy="76" r="1.3" class="solido" />
            <circle cx="236" cy="82" r="1.3" class="solido" />
            <circle cx="14" cy="120" r="1.3" class="solido" />
            <circle cx="246" cy="112" r="1.3" class="solido" />
          }
          @case ('prancheta') {
            <circle cx="95" cy="88" r="84" class="fino tracejado" />
            <circle cx="95" cy="88" r="62" class="fino" />
            <ellipse cx="95" cy="160" rx="70" ry="10" class="fino" />
            <path d="M8 60l10 6M172 40l10 6M20 130l8-4" class="fino" />
            <rect
              x="60"
              y="34"
              width="70"
              height="96"
              rx="6"
              class="preenchido"
              stroke-width="2.4"
            />
            <rect
              x="80"
              y="26"
              width="30"
              height="14"
              rx="4"
              class="preenchido forte"
              stroke-width="2"
            />
            <path d="M72 62h30M72 78h46M72 94h38M72 110h24" class="linha" />
            <circle cx="124" cy="116" r="15" class="solido" />
            <path d="M117 116l5 5 9-10" class="sobre-solido" stroke-width="2.6" />
          }
          @case ('pix') {
            <path
              [attr.d]="pixPath"
              transform="scale(0.09375)"
              [attr.fill]="pixCor"
              stroke="none"
            />
          }
        }
      </g>
    </svg>
  `,
  styles: `
    :host {
      --arte-cor: var(--sep-chart-blue);

      display: inline-block;
      color: var(--arte-cor);
      line-height: 0;
      vertical-align: middle;
    }

    :host([data-tom='ciano']) {
      --arte-cor: var(--sep-chart-cyan);
    }

    :host([data-tom='verde']) {
      --arte-cor: var(--sep-chart-green);
    }

    :host([data-tom='vermelho']) {
      --arte-cor: var(--sep-chart-red);
    }

    svg {
      display: block;
      width: 100%;
      height: 100%;
      overflow: visible;
      fill: none;
      stroke: currentcolor;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    /* O neon da tela imersiva: so no escuro, e sobre o vetor inteiro, sem borrar o traco. */
    :host-context(.dark) svg {
      filter: drop-shadow(0 0 4px color-mix(in srgb, currentcolor 55%, transparent));
    }

    .fino {
      stroke-width: 1;
      opacity: 0.45;
    }

    .tracejado {
      stroke-dasharray: 2 5;
    }

    .linha {
      stroke-width: 2;
      opacity: 0.55;
    }

    .preenchido {
      fill: currentcolor;
      fill-opacity: 0.1;
    }

    .forte {
      fill-opacity: 0.3;
    }

    .solido {
      fill: currentcolor;
      stroke: none;
    }

    .sobre-solido {
      stroke: var(--sep-on-solid);
    }

    .dente {
      stroke-width: 5;
      stroke-linecap: butt;
    }
  `,
})
export class SepArteComponent {
  readonly nome = input.required<NomeArte>();
  /** Troca a cor padrao da arte, quando o widget pede outro tom. */
  readonly tom = input<TomArte | null>(null);

  protected readonly d = D;
  protected readonly pixPath = PIX_LOGO_PATH;
  protected readonly pixCor = PIX_COR;
  protected readonly dentes = [0, 45, 90, 135, 180, 225, 270, 315];

  protected readonly tomFinal = computed(() => this.tom() ?? TOM_PADRAO[this.nome()]);
  protected readonly caixa = computed(() => `0 0 ${CAIXA[this.nome()].join(' ')}`);
  protected readonly proporcao = computed(() => CAIXA[this.nome()].join(' / '));

  /**
   * Deslocamento que poe o centro do desenho no centro da caixa. Medido no proprio SVG depois de
   * desenhar: assim nenhuma arte depende de o autor ter acertado as coordenadas a mao — o usuario
   * cobrou centralizacao dentro do widget, e o PNG estava ate 20px fora do centro do proprio arquivo.
   */
  protected readonly centro = signal<string | null>(null);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterRenderEffect(() => {
      this.nome();
      const g = this.host.nativeElement.querySelector('svg > g');
      // `getBBox` nao existe no jsdom dos testes: sem medida, o desenho fica onde foi tracado.
      if (!g || typeof (g as SVGGElement).getBBox !== 'function') return;
      const [w, h] = CAIXA[this.nome()];
      const anterior = g.getAttribute('transform');
      g.removeAttribute('transform');
      let bb: DOMRect;
      try {
        bb = (g as SVGGElement).getBBox();
      } catch {
        return;
      }
      if (anterior) g.setAttribute('transform', anterior);
      if (!bb.width || !bb.height) return;
      const dx = Math.round((w / 2 - (bb.x + bb.width / 2)) * 10) / 10;
      const dy = Math.round((h / 2 - (bb.y + bb.height / 2)) * 10) / 10;
      this.centro.set(dx || dy ? `translate(${dx} ${dy})` : null);
    });
  }
}
