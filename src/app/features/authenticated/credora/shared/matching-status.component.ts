import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { StatusMatchingCredoraOperacao } from '../../../../core/api/api.models';

type VarianteStatusMatching = 'sugerida' | 'confirmada' | 'rejeitada';

// Label curto por status da sugestao de matching. A tela apenas apresenta; a transicao
// SUGERIDA -> CONFIRMADA | REJEITADA pertence ao backend (Sprint 30).
const LABELS: Record<StatusMatchingCredoraOperacao, string> = {
  SUGERIDA: 'Sugerida',
  CONFIRMADA: 'Confirmada',
  REJEITADA: 'Rejeitada',
};

const VARIANTES: Record<StatusMatchingCredoraOperacao, VarianteStatusMatching> = {
  SUGERIDA: 'sugerida',
  CONFIRMADA: 'confirmada',
  REJEITADA: 'rejeitada',
};

// Badge de status da sugestao de matching credora-operacao. Componente puramente visual: o texto
// do label garante que o estado nao dependa so de cor.
@Component({
  selector: 'sep-matching-status',
  imports: [],
  templateUrl: './matching-status.component.html',
  styleUrl: './matching-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchingStatusComponent {
  readonly status = input.required<StatusMatchingCredoraOperacao>();

  protected readonly label = computed(() => LABELS[this.status()]);
  protected readonly variante = computed(() => VARIANTES[this.status()]);
}
