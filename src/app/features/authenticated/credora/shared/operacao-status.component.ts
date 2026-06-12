import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { StatusOperacaoFinanciada } from '../../../../core/api/api.models';

type VarianteOperacao = 'associada' | 'encerrada';

// Label operacional curto por status da operacao financiada. A tela apenas apresenta; a transicao
// pertence ao backend.
const LABELS: Record<StatusOperacaoFinanciada, string> = {
  ASSOCIADA: 'Associada',
  ENCERRADA: 'Encerrada',
};

const VARIANTES: Record<StatusOperacaoFinanciada, VarianteOperacao> = {
  ASSOCIADA: 'associada',
  ENCERRADA: 'encerrada',
};

// Badge de status de operacao da carteira. Componente puramente visual, reusado em lista e detalhe.
@Component({
  selector: 'sep-operacao-status',
  imports: [],
  templateUrl: './operacao-status.component.html',
  styleUrl: './operacao-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperacaoStatusComponent {
  readonly status = input.required<StatusOperacaoFinanciada>();

  protected readonly label = computed(() => LABELS[this.status()]);
  protected readonly variante = computed(() => VARIANTES[this.status()]);
}
