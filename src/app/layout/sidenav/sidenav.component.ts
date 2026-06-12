import { ChangeDetectionStrategy, Component, Input, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { UsuarioRole } from '../../core/api/api.models';
import { AuthService } from '../../core/auth/auth.service';

interface MenuItem {
  label: string;
  route: string;
  icon: string;
  roles?: UsuarioRole[];
}

interface MenuGroup {
  label: string | null;
  items: MenuItem[];
}

@Component({
  selector: 'sep-sidenav',
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './sidenav.component.html',
  styleUrl: './sidenav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidenavComponent {
  private readonly auth = inject(AuthService);

  @Input() collapsed = false;

  protected readonly currentUser = this.auth.currentUser;

  protected readonly visibleGroups = computed<MenuGroup[]>(() => {
    const user = this.currentUser();
    const groups: MenuGroup[] = [
      {
        label: null,
        items: [{ label: 'Dashboard', route: '/app/dashboard', icon: 'layout-dashboard' }],
      },
      {
        label: 'Jornadas',
        items: [
          { label: 'Onboarding', route: '/app/onboarding', icon: 'shield' },
          { label: 'Credito', route: '/app/credito', icon: 'credit-card' },
          { label: 'Formalizacao', route: '/app/formalizacao', icon: 'file-text' },
          { label: 'Cobranca', route: '/app/cobranca', icon: 'banknote' },
          { label: 'Credora', route: '/app/credora', icon: 'briefcase', roles: ['CLIENTE'] },
        ],
      },
      {
        label: 'Operacao',
        items: [
          {
            label: 'Backoffice',
            route: '/app/backoffice',
            icon: 'settings',
            roles: ['BACKOFFICE', 'FINANCEIRO', 'ADMIN'],
          },
          {
            label: 'Pix',
            route: '/app/pix',
            icon: 'wallet',
            roles: ['FINANCEIRO', 'ADMIN', 'BACKOFFICE'],
          },
        ],
      },
      {
        label: 'Conta',
        items: [
          { label: 'Meu perfil', route: '/app/profile', icon: 'user-check' },
          { label: 'Administracao', route: '/app/admin', icon: 'users', roles: ['ADMIN'] },
        ],
      },
    ];

    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) => !item.roles || (user != null && item.roles.includes(user.role)),
        ),
      }))
      .filter((group) => group.items.length > 0);
  });
}
