import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';

interface CobrancaLink {
  label: string;
  description: string;
  route: string;
}

// Landing da jornada de cobranca, ramificada por perfil:
// - FINANCEIRO/ADMIN: telas de acompanhamento (agenda financeira, inadimplencia).
//   Espelha a autorizacao do backend (CobrancaController = hasAnyRole FINANCEIRO/ADMIN).
// - CLIENTE (tomador): parcelas acessadas a partir de um contrato assinado; nao ha
//   lista global de agendas no backend, entao a entrada e via formalizacao.
// - Demais perfis (ex.: BACKOFFICE): sem jornada de cobranca — o backend nao os autoriza.
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

  protected readonly isOperadorFinanceiro = computed(() => {
    const role = this.currentUser()?.role;
    return role === 'FINANCEIRO' || role === 'ADMIN';
  });

  protected readonly isTomador = computed(() => this.currentUser()?.role === 'CLIENTE');

  protected readonly linksFinanceiro: CobrancaLink[] = [
    {
      label: 'Agenda financeira',
      description: 'Parcelas e recebimentos manuais.',
      route: '/app/cobranca/financeiro/agenda',
    },
    {
      label: 'Inadimplencia',
      description: 'Triagem de atrasos e renegociacao.',
      route: '/app/cobranca/financeiro/inadimplencia',
    },
  ];
}
