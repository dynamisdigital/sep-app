import { ChangeDetectionStrategy, Component, Input, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { UsuarioRole } from '../../core/api/api.models';
import { AuthService } from '../../core/auth/auth.service';

interface MenuItem {
  label: string;
  route: string;
  roles?: UsuarioRole[];
  disabled?: boolean;
}

@Component({
  selector: 'sep-sidenav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidenav.component.html',
  styleUrl: './sidenav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidenavComponent {
  private readonly auth = inject(AuthService);

  @Input() collapsed = false;

  protected readonly currentUser = this.auth.currentUser;

  protected readonly visibleItems = computed<MenuItem[]>(() => {
    const user = this.currentUser();
    const items: MenuItem[] = [
      { label: 'Dashboard', route: '/app/dashboard' },
      { label: 'Onboarding', route: '/app/onboarding' },
      { label: 'Credito', route: '/app/credito' },
      { label: 'Formalizacao', route: '/app/formalizacao' },
      { label: 'Cobranca', route: '/app/cobranca' },
      {
        label: 'Backoffice',
        route: '/app/backoffice',
        roles: ['BACKOFFICE', 'FINANCEIRO', 'ADMIN'],
      },
      { label: 'Meu perfil', route: '/app/profile' },
      { label: 'Administracao', route: '/app/admin', roles: ['ADMIN'] },
    ];

    return items.filter((item) => {
      if (item.roles && (!user || !item.roles.includes(user.role))) {
        return false;
      }
      return true;
    });
  });
}
