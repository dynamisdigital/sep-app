import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { StatusPixRecebimento } from '../../../../core/api/api.models';
import { STATUS_RECEBIMENTO_LABEL } from './pix-format';

type VarianteRecebimento = 'andamento' | 'sucesso' | 'aviso' | 'falha';

// Variante visual por status. Apenas apresentacao. NAO_IDENTIFICADO recebe destaque (aviso) e
// FALHOU sai como falha — nunca apresentados como recebimento concluido.
const VARIANTES: Record<StatusPixRecebimento, VarianteRecebimento> = {
  RECEBIDO: 'andamento',
  EM_PROCESSAMENTO: 'andamento',
  CONCILIADO: 'sucesso',
  NAO_IDENTIFICADO: 'aviso',
  FALHOU: 'falha',
};

// Badge de status de recebimento Pix. Componente puramente visual.
@Component({
  selector: 'sep-pix-recebimento-status',
  imports: [],
  templateUrl: './pix-recebimento-status.component.html',
  styleUrl: './pix-recebimento-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PixRecebimentoStatusComponent {
  readonly status = input.required<StatusPixRecebimento>();

  protected readonly label = computed(() => STATUS_RECEBIMENTO_LABEL[this.status()]);
  protected readonly variante = computed(() => VARIANTES[this.status()]);
}
