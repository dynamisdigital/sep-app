import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ValorAtualizadoParcelaResponse } from '../../../../core/api/api.models';
import { formatarMoeda } from './cobranca-format';

// Composicao do valor atualizado da parcela (principal, juros, mora, multa, recebido,
// devido e saldo). Apenas apresentacao dos valores calculados no backend; reusado no
// detalhe do tomador e na visao financeira. Triangulacao: extraido apos dois consumidores.
@Component({
  selector: 'sep-parcela-composicao',
  imports: [],
  templateUrl: './parcela-composicao.component.html',
  styleUrl: './parcela-composicao.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParcelaComposicaoComponent {
  readonly parcela = input.required<ValorAtualizadoParcelaResponse>();

  protected readonly formatarMoeda = formatarMoeda;
}
