import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import {
  FaixaDonut,
  corDoTom,
  fatiasDonut,
  gradienteDonut,
  haloDonut,
  totalDonut,
} from '../../../../shared/donut';

// Donut do modulo de Correspondentes: o mesmo desenho das telas operacionais (conic-gradient com
// furo e halo, em tokens de tema), com a legenda ao lado. Sem dado, o anel fica neutro.
@Component({
  selector: 'sep-cor-donut',
  templateUrl: './cor-donut.component.html',
  styleUrl: './cor-donut.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorDonutComponent {
  readonly faixas = input.required<FaixaDonut[]>();
  /** Texto pequeno sob o total, no furo do anel. */
  readonly legendaCentro = input('Total');
  /** Substitui o total no furo (ex.: "2,4%"). */
  readonly centro = input<string | null>(null);
  /** Rotulo acessivel do grafico inteiro. */
  readonly descricao = input('Distribuição');

  protected readonly fatias = computed(() => fatiasDonut(this.faixas()));
  protected readonly total = computed(() => totalDonut(this.faixas()));
  protected readonly gradiente = computed(() => gradienteDonut(this.faixas()));
  protected readonly halo = computed(() => haloDonut(this.faixas()));
  protected readonly cor = corDoTom;
}
