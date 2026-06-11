import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { StatusPixTransferencia } from '../../../../core/api/api.models';
import { STATUS_TRANSFERENCIA_LABEL } from './pix-format';

type VarianteTransferencia = 'neutro' | 'andamento' | 'sucesso' | 'falha';

// Variante visual por status. Apenas apresentacao; nao decide transicao de estado. FALHOU e
// CANCELADA sao terminais negativos — nunca apresentados como sucesso.
const VARIANTES: Record<StatusPixTransferencia, VarianteTransferencia> = {
  CRIADA: 'neutro',
  SOLICITADA: 'andamento',
  PROCESSANDO: 'andamento',
  CONCLUIDA: 'sucesso',
  FALHOU: 'falha',
  CANCELADA: 'falha',
};

// Badge de status de transferencia Pix. Componente puramente visual.
@Component({
  selector: 'sep-pix-transferencia-status',
  imports: [],
  templateUrl: './pix-transferencia-status.component.html',
  styleUrl: './pix-transferencia-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PixTransferenciaStatusComponent {
  readonly status = input.required<StatusPixTransferencia>();

  protected readonly label = computed(() => STATUS_TRANSFERENCIA_LABEL[this.status()]);
  protected readonly variante = computed(() => VARIANTES[this.status()]);
}
