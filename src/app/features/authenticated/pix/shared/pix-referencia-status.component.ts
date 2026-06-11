import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { StatusPixReferenciaRecebimento } from '../../../../core/api/api.models';
import { STATUS_REFERENCIA_LABEL } from './pix-format';

type VarianteReferencia = 'neutro' | 'andamento' | 'sucesso' | 'aviso';

// Variante visual por status. Apenas apresentacao. DIVERGENTE recebe destaque (aviso) para nao
// passar despercebido como estado normal.
const VARIANTES: Record<StatusPixReferenciaRecebimento, VarianteReferencia> = {
  ATIVA: 'andamento',
  PAGA: 'sucesso',
  EXPIRADA: 'neutro',
  CANCELADA: 'neutro',
  DIVERGENTE: 'aviso',
};

// Badge de status de referencia Pix de recebimento. Componente puramente visual.
@Component({
  selector: 'sep-pix-referencia-status',
  imports: [],
  templateUrl: './pix-referencia-status.component.html',
  styleUrl: './pix-referencia-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PixReferenciaStatusComponent {
  readonly status = input.required<StatusPixReferenciaRecebimento>();

  protected readonly label = computed(() => STATUS_REFERENCIA_LABEL[this.status()]);
  protected readonly variante = computed(() => VARIANTES[this.status()]);
}
