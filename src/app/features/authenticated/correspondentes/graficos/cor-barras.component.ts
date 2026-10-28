import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { TomDonut, corDoTom } from '../../../../shared/donut';

export interface BarraGrafico {
  rotulo: string;
  valor: number;
  tom?: TomDonut;
  /** Texto exibido acima da barra; por padrao, o valor formatado. */
  destaque?: string;
}

// Barras verticais simples para series curtas (6 a 12 itens). A altura e proporcional ao maior
// valor; barra sem valor fica como um traco, para o eixo continuar legivel.
@Component({
  selector: 'sep-cor-barras',
  templateUrl: './cor-barras.component.html',
  styleUrl: './cor-barras.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorBarrasComponent {
  readonly itens = input.required<BarraGrafico[]>();
  readonly formato = input<(valor: number) => string>((v) => String(v));
  readonly descricao = input('Gráfico de barras');

  protected readonly maximo = computed(() => Math.max(0, ...this.itens().map((i) => i.valor)));
  protected readonly cor = corDoTom;

  protected altura(valor: number): string {
    const max = this.maximo();
    return max && valor > 0 ? `${Math.max(4, (valor / max) * 100)}%` : '2px';
  }
}
