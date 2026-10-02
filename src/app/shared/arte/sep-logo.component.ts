// SEP — Frontend
// Frontend Development: Daniel Möllmann
// Angular • TypeScript — 2026

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Marca SEP em vetor: o simbolo (tetraedro visto de cima, azul para ciano) e a palavra em traco
 * geometrico. Substitui os PNG de 113x48 e 86x39 dos pacotes de mockup, que so existiam sobre
 * fundo escuro e borravam em qualquer tamanho fora do nativo.
 *
 * A palavra sai em `currentColor`: preta no claro, branca no escuro, sem arquivo por tema. O
 * simbolo mantem o degrade da marca nos dois.
 */
@Component({
  selector: 'sep-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'img',
    '[attr.aria-label]': 'rotulo()',
    '[class.simbolo]': 'variante() === "simbolo"',
  },
  template: `
    <svg [attr.viewBox]="variante() === 'simbolo' ? '0 0 48 48' : '0 0 122 48'" focusable="false">
      <defs>
        <linearGradient [attr.id]="idGradiente" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#1b7fe8" />
          <stop offset="1" stop-color="#19d2ff" />
        </linearGradient>
      </defs>
      <g class="simbolo-g" [attr.stroke]="'url(#' + idGradiente + ')'">
        <path d="M5 9h38L24 42z" class="borda" />
        <path d="M10.5 12.5h27L24 36z" class="face" />
        <path d="M24 21.5L5 9M24 21.5L43 9M24 21.5V42" class="aresta" />
      </g>
      @if (variante() !== 'simbolo') {
        <g class="palavra">
          <path
            d="M77 14.5H62.5q-3.5 0-3.5 3.5v2.5q0 3.5 3.5 3.5h10q3.5 0 3.5 3.5V30q0 3.5-3.5 3.5H57"
          />
          <path d="M98 14.5H84v19h14M84 24h11.5" />
          <path d="M105 33.5v-19h9.5q4.5 0 4.5 4.5v1.5q0 4.5-4.5 4.5H105" />
        </g>
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-block;
      width: 113px;
      aspect-ratio: 122 / 48;
      color: var(--sep-text-strong);
      line-height: 0;
      vertical-align: middle;
    }

    :host(.simbolo) {
      aspect-ratio: 1;
    }

    svg {
      display: block;
      width: 100%;
      height: 100%;
      overflow: visible;
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .borda {
      stroke-width: 3.2;
    }

    .face {
      fill: #19d2ff;
      fill-opacity: 0.16;
      stroke-width: 1.2;
      stroke-opacity: 0.7;
    }

    .aresta {
      stroke-width: 2.2;
    }

    .palavra {
      stroke: currentcolor;
      stroke-width: 5;
    }

    :host-context(.dark) .simbolo-g {
      filter: drop-shadow(0 0 5px rgb(25 210 255 / 45%));
    }
  `,
})
export class SepLogoComponent {
  private static contador = 0;

  /** `completo` (simbolo + palavra) ou so o `simbolo`. */
  readonly variante = input<'completo' | 'simbolo'>('completo');
  readonly rotulo = input('SEP');

  // Um id por instancia: dois logos na mesma pagina com o mesmo `<linearGradient id>` fariam o
  // segundo pintar com o gradiente do primeiro — e sumir quando aquele fosse removido.
  protected readonly idGradiente = `sep-logo-g${++SepLogoComponent.contador}`;
}
