import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ResultadoOnboardingResponse, StatusOnboarding } from '../../../../core/api/api.models';

type VarianteStatus = 'aprovado' | 'reprovado' | 'pendente' | 'andamento';

// Apresenta o status de onboarding como badge semantico + linha de resultado.
// Componente puramente visual: nao decide transicoes; so reflete o estado atual
// devolvido pelo backend. Reutilizado pelas jornadas PF e PJ.
@Component({
  selector: 'sep-onboarding-status',
  imports: [],
  templateUrl: './onboarding-status.component.html',
  styleUrl: './onboarding-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingStatusComponent {
  readonly status = input.required<StatusOnboarding>();
  readonly resultado = input<ResultadoOnboardingResponse | null>(null);

  protected readonly variante = computed<VarianteStatus>(() => varianteDoStatus(this.status()));
}

function varianteDoStatus(status: StatusOnboarding): VarianteStatus {
  switch (status) {
    case 'APROVADO':
    case 'APROVADO_FINAL':
      return 'aprovado';
    case 'REPROVADO':
    case 'REPROVADO_PLD':
      return 'reprovado';
    case 'PENDENCIA':
      return 'pendente';
    case 'INICIADO':
    case 'DOCUMENTOS_RECEBIDOS':
    case 'EM_VERIFICACAO':
      return 'andamento';
  }
}
