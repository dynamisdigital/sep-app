import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { StatusElegibilidade } from '../../../../core/api/api.models';

type VarianteElegibilidade = 'elegivel' | 'pendente' | 'inelegivel';

// Label operacional curto por elegibilidade derivada do onboarding PJ. A tela apenas apresenta; a
// derivacao de elegibilidade pertence ao backend (KYB/PLD).
const LABELS: Record<StatusElegibilidade, string> = {
  PENDENTE: 'Em analise',
  ELEGIVEL: 'Elegivel',
  INELEGIVEL: 'Inelegivel',
};

const VARIANTES: Record<StatusElegibilidade, VarianteElegibilidade> = {
  PENDENTE: 'pendente',
  ELEGIVEL: 'elegivel',
  INELEGIVEL: 'inelegivel',
};

// Badge de elegibilidade da credora. Componente puramente visual.
@Component({
  selector: 'sep-elegibilidade-status',
  imports: [],
  templateUrl: './elegibilidade-status.component.html',
  styleUrl: './elegibilidade-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElegibilidadeStatusComponent {
  readonly elegibilidade = input.required<StatusElegibilidade>();

  protected readonly label = computed(() => LABELS[this.elegibilidade()]);
  protected readonly variante = computed(() => VARIANTES[this.elegibilidade()]);
}
