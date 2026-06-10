import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface AdminCard {
  label: string;
  description: string;
  route?: string;
  disabled?: boolean;
}

// Landing da area Administracao (ADMIN-only; guard herdado da rota pai).
// Parametros operacionais entram em F-12.4: ate la o card fica desabilitado, sem
// apontar para rota inexistente. Roles cumulativas nao tem card proprio — sao
// geridas no detalhe do usuario (/app/admin/users/:id) em F-12.3.
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
      disabled: true,
    },
  ];
}
