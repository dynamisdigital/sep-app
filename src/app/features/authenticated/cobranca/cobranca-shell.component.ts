import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';

interface CobrancaPlaceholder {
  label: string;
  description: string;
}

// Landing da jornada de cobranca. O tomador acessa as parcelas a partir de um
// contrato assinado (nao ha lista global de agendas no backend); o financeiro/admin
// ganha as telas de acompanhamento (agenda, recebimentos, inadimplencia) nas Tasks
// F-9.4/F-9.5, quando os placeholders viram rotas reais.
@Component({
  selector: 'sep-cobranca-shell',
  imports: [RouterLink],
  templateUrl: './cobranca-shell.component.html',
  styleUrl: './cobranca-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CobrancaShellComponent {
  private readonly auth = inject(AuthService);

  protected readonly currentUser = this.auth.currentUser;

  protected readonly isOperador = computed(() => {
    const role = this.currentUser()?.role;
    return role === 'FINANCEIRO' || role === 'ADMIN';
  });

  protected readonly placeholdersFinanceiro: CobrancaPlaceholder[] = [
    { label: 'Agenda financeira', description: 'Parcelas e recebimentos manuais (em preparacao).' },
    { label: 'Inadimplencia', description: 'Triagem de atrasos e renegociacao (em preparacao).' },
  ];
}
