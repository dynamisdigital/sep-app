import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { UsuarioRole } from '../../../core/api/api.models';
import { AuthService } from '../../../core/auth/auth.service';

type DashboardTone = 'primary' | 'secondary' | 'warning' | 'devolutiva';

interface DashboardShortcut {
  label: string;
  description: string;
  route: string;
  icon: string;
  tone: DashboardTone;
  roles?: UsuarioRole[];
}

interface DashboardPlaceholder {
  label: string;
  description: string;
  icon: string;
  tone: DashboardTone;
}

@Component({
  selector: 'sep-dashboard',
  imports: [RouterLink, LucideAngularModule],
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
        icon: 'user-check',
        tone: 'primary',
      },
      {
        label: 'Alterar senha',
        description: 'Atualize sua senha de acesso.',
        route: '/app/profile/change-password',
        icon: 'lock',
        tone: 'warning',
      },
      {
        label: 'Administracao de usuarios',
        description: 'Gerencie e consulte usuarios cadastrados.',
        route: '/app/admin/users',
        icon: 'users',
        tone: 'devolutiva',
        roles: ['ADMIN'],
      },
    ];
    return all.filter((s) => {
      if (s.roles && (!user || !s.roles.includes(user.role))) return false;
      return true;
    });
  });

  protected readonly placeholders: DashboardPlaceholder[] = [
    {
      label: 'Onboarding',
      description: 'KYC/KYB e validacoes cadastrais.',
      icon: 'shield',
      tone: 'primary',
    },
    {
      label: 'Analise de credito',
      description: 'Proposta, parecer e decisao.',
      icon: 'credit-card',
      tone: 'secondary',
    },
    {
      label: 'Formalizacao',
      description: 'Aceite e assinatura digital.',
      icon: 'file-text',
      tone: 'devolutiva',
    },
    {
      label: 'Cobranca',
      description: 'Parcelas e inadimplencia.',
      icon: 'banknote',
      tone: 'warning',
    },
  ];
}
