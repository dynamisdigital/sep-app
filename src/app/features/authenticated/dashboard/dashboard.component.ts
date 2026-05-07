import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';

interface DashboardShortcut {
  label: string;
  description: string;
  route: string;
  roles?: ('ADMIN' | 'CLIENTE')[];
}

interface DashboardPlaceholder {
  label: string;
  description: string;
}

@Component({
  selector: 'sep-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly auth = inject(AuthService);

  protected readonly currentUser = this.auth.currentUser;

  protected readonly shortcuts = computed<DashboardShortcut[]>(() => {
    const user = this.currentUser();
    const all: DashboardShortcut[] = [
      {
        label: 'Meu perfil',
        description: 'Veja seus dados de cadastro e auditoria.',
        route: '/app/profile',
      },
      {
        label: 'Alterar senha',
        description: 'Atualize sua senha de acesso.',
        route: '/app/profile/change-password',
      },
      {
        label: 'Administracao de usuarios',
        description: 'Gerencie e consulte usuarios cadastrados.',
        route: '/app/admin/users',
        roles: ['ADMIN'],
      },
    ];
    return all.filter((s) => {
      if (s.roles && (!user || !s.roles.includes(user.role))) return false;
      return true;
    });
  });

  protected readonly placeholders: DashboardPlaceholder[] = [
    { label: 'Onboarding', description: 'KYC/KYB e validacoes cadastrais (em preparacao).' },
    { label: 'Analise de credito', description: 'Proposta, parecer e decisao (em preparacao).' },
    { label: 'Formalizacao', description: 'Aceite e assinatura digital (em preparacao).' },
    { label: 'Cobranca', description: 'Parcelas e inadimplencia (em preparacao).' },
  ];
}
