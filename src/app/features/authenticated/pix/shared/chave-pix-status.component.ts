import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { StatusChavePix } from '../../../../core/api/api.models';
import { STATUS_CHAVE_LABEL } from './pix-format';

type VarianteChave = 'ativa' | 'inativa';

// Variante visual por estado, com switch exaustivo sobre o union: um estado novo no backend
// quebra a compilacao em vez de cair num default silencioso. Apenas apresentacao.
const VARIANTES: Record<StatusChavePix, VarianteChave> = {
  ATIVA: 'ativa',
  INATIVA: 'inativa',
};

// Badge de estado da chave Pix da conta operacional. O rotulo e textual — a cor nunca e o unico
// portador da informacao (WCAG 1.4.1).
@Component({
  selector: 'sep-chave-pix-status',
  imports: [],
  templateUrl: './chave-pix-status.component.html',
  styleUrl: './chave-pix-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChavePixStatusComponent {
  readonly status = input.required<StatusChavePix>();

  protected readonly label = computed(() => STATUS_CHAVE_LABEL[this.status()]);
  protected readonly variante = computed(() => VARIANTES[this.status()]);
}
