import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { StatusCredora } from '../../../../core/api/api.models';

type VarianteStatusCredora = 'ativa' | 'cadastrada' | 'suspensa';

// Label operacional curto por status cadastral. A tela apenas apresenta; a transicao pertence ao
// backend.
const LABELS: Record<StatusCredora, string> = {
  CADASTRADA: 'Cadastrada',
  ATIVA: 'Ativa',
  SUSPENSA: 'Suspensa',
};

const VARIANTES: Record<StatusCredora, VarianteStatusCredora> = {
  CADASTRADA: 'cadastrada',
  ATIVA: 'ativa',
  SUSPENSA: 'suspensa',
};

// Badge de status cadastral da credora. Componente puramente visual.
@Component({
  selector: 'sep-credora-status',
  imports: [],
  templateUrl: './credora-status.component.html',
  styleUrl: './credora-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CredoraStatusComponent {
  readonly status = input.required<StatusCredora>();

  protected readonly label = computed(() => LABELS[this.status()]);
  protected readonly variante = computed(() => VARIANTES[this.status()]);
}
