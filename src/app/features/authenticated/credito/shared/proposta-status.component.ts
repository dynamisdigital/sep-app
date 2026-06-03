import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { StatusProposta } from '../../../../core/api/api.models';

type VarianteProposta = 'andamento' | 'pre' | 'aprovado' | 'reprovado' | 'pendente';

// Label operacional curto por status. A tela apenas apresenta; nao decide transicao.
const LABELS: Record<StatusProposta, string> = {
  EM_ANALISE: 'Em analise',
  PRE_APROVADA: 'Pre-aprovada',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  PENDENCIA: 'Pendencia',
};

const VARIANTES: Record<StatusProposta, VarianteProposta> = {
  EM_ANALISE: 'andamento',
  PRE_APROVADA: 'pre',
  APROVADA: 'aprovado',
  REJEITADA: 'reprovado',
  PENDENCIA: 'pendente',
};

// Badge de status de proposta. Componente puramente visual, reusado em lista,
// detalhe e painel de score (status sugerido).
@Component({
  selector: 'sep-proposta-status',
  imports: [],
  templateUrl: './proposta-status.component.html',
  styleUrl: './proposta-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropostaStatusComponent {
  readonly status = input.required<StatusProposta>();

  protected readonly label = computed(() => LABELS[this.status()]);
  protected readonly variante = computed(() => VARIANTES[this.status()]);
}
