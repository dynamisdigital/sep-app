import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { StatusParcela } from '../../../../core/api/api.models';
import { STATUS_PARCELA_LABEL } from './cobranca-format';

type VarianteParcela = 'neutro' | 'andamento' | 'pago' | 'atraso' | 'grave';

// Variante visual por status. Apenas apresentacao; nao decide transicao de estado.
const VARIANTES: Record<StatusParcela, VarianteParcela> = {
  PENDENTE: 'neutro',
  PARCIALMENTE_PAGA: 'andamento',
  PAGA: 'pago',
  ATRASADA: 'atraso',
  INADIMPLENTE: 'grave',
  EM_NEGOCIACAO: 'andamento',
  RENEGOCIADA: 'neutro',
};

// Badge de status de parcela. Componente puramente visual, reusado na agenda e no
// detalhe de parcela.
@Component({
  selector: 'sep-parcela-status',
  imports: [],
  templateUrl: './parcela-status.component.html',
  styleUrl: './parcela-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParcelaStatusComponent {
  readonly status = input.required<StatusParcela>();

  protected readonly label = computed(() => STATUS_PARCELA_LABEL[this.status()]);
  protected readonly variante = computed(() => VARIANTES[this.status()]);
}
