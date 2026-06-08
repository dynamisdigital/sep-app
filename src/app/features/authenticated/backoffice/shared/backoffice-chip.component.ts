import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { PrioridadeItem, StatusItemFila } from '../../../../core/api/api.models';
import { PRIORIDADE_ITEM_LABEL, STATUS_ITEM_FILA_LABEL } from './backoffice-format';

// Chip visual de prioridade OU status de item da fila. Recebe exatamente um dos dois; a cor
// vem do data-attribute. Componente puramente apresentacional, reusado em lista, detalhe e
// acoes; nao interpreta regra de negocio.
@Component({
  selector: 'sep-backoffice-chip',
  template: `{{ label() }}`,
  styleUrl: './backoffice-chip.component.scss',
  host: {
    class: 'sep-bo-chip',
    '[attr.data-prioridade]': 'prioridade()',
    '[attr.data-status]': 'status()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackofficeChipComponent {
  readonly prioridade = input<PrioridadeItem | null>(null);
  readonly status = input<StatusItemFila | null>(null);

  protected readonly label = computed(() => {
    const prioridade = this.prioridade();
    if (prioridade) {
      return PRIORIDADE_ITEM_LABEL[prioridade];
    }
    const status = this.status();
    return status ? STATUS_ITEM_FILA_LABEL[status] : '';
  });
}
