import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { StatusAporteCredora } from '../../../../core/api/api.models';

type VarianteStatusAporte = 'pendente' | 'processando' | 'liquidado' | 'falhou';

// Label curto por status do aporte. A tela apenas apresenta; o ciclo
// PENDENTE -> EM_PROCESSAMENTO -> LIQUIDADO | FALHOU pertence ao backend (Sprint 29).
const LABELS: Record<StatusAporteCredora, string> = {
  PENDENTE: 'Pendente',
  EM_PROCESSAMENTO: 'Em processamento',
  LIQUIDADO: 'Liquidado',
  FALHOU: 'Falhou',
};

const VARIANTES: Record<StatusAporteCredora, VarianteStatusAporte> = {
  PENDENTE: 'pendente',
  EM_PROCESSAMENTO: 'processando',
  LIQUIDADO: 'liquidado',
  FALHOU: 'falhou',
};

// Badge de status do aporte da credora. Componente puramente visual: o texto do label garante que
// o estado nao dependa so de cor.
@Component({
  selector: 'sep-aporte-status',
  imports: [],
  templateUrl: './aporte-status.component.html',
  styleUrl: './aporte-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AporteStatusComponent {
  readonly status = input.required<StatusAporteCredora>();

  protected readonly label = computed(() => LABELS[this.status()]);
  protected readonly variante = computed(() => VARIANTES[this.status()]);
}
