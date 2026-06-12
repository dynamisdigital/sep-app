import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { StatusOportunidade } from '../../../../core/api/api.models';

type VarianteOportunidade = 'disponivel' | 'encerrada';

// Label operacional curto por disponibilidade da oportunidade. A tela apenas apresenta; a
// disponibilidade pertence ao backend.
const LABELS: Record<StatusOportunidade, string> = {
  DISPONIVEL: 'Disponivel',
  ENCERRADA: 'Encerrada',
};

const VARIANTES: Record<StatusOportunidade, VarianteOportunidade> = {
  DISPONIVEL: 'disponivel',
  ENCERRADA: 'encerrada',
};

// Badge de status de oportunidade. Componente puramente visual, reusado em lista e detalhe.
@Component({
  selector: 'sep-oportunidade-status',
  imports: [],
  templateUrl: './oportunidade-status.component.html',
  styleUrl: './oportunidade-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OportunidadeStatusComponent {
  readonly status = input.required<StatusOportunidade>();

  protected readonly label = computed(() => LABELS[this.status()]);
  protected readonly variante = computed(() => VARIANTES[this.status()]);
}
