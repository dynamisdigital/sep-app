import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface AdminCard {
  label: string;
  description: string;
  route?: string;
  disabled?: boolean;
}

// Landing da area Administracao (ADMIN-only; guard herdado da rota pai). Cards levam a
// Usuarios e Parametros operacionais. Roles cumulativas nao tem card proprio — sao geridas
// no detalhe do usuario (/app/admin/users/:id). O suporte a card desabilitado permanece
// para futuras areas ainda nao entregues.
@Component({
  selector: 'sep-admin-home',
  imports: [RouterLink],
  templateUrl: './admin-home.component.html',
  styleUrl: './admin-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminHomeComponent {
  protected readonly cards: AdminCard[] = [
    {
      label: 'Usuarios',
      description: 'Lista de usuarios, detalhe e gestao de roles.',
      route: '/app/admin/users',
    },
    {
      label: 'Parametros operacionais',
      description: 'Catalogo versionado de parametros e historico de alteracoes.',
      route: '/app/admin/parametros',
    },
  ];
}
