import { Routes } from '@angular/router';

import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';

export const AUTHENTICATED_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('../../layout/shell/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
        data: { breadcrumb: 'Dashboard' },
      },
      {
        path: 'profile',
        loadComponent: () => import('./profile/profile.component').then((m) => m.ProfileComponent),
        data: { breadcrumb: 'Meu perfil' },
      },
      {
        path: 'profile/change-password',
        loadComponent: () =>
          import('./profile/change-password/change-password.component').then(
            (m) => m.ChangePasswordComponent,
          ),
        data: { breadcrumb: 'Alterar senha' },
      },
      {
        path: 'admin',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'], breadcrumb: 'Administracao' },
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'users' },
          {
            path: 'users',
            loadComponent: () =>
              import('./admin/users/users-list.component').then((m) => m.UsersListComponent),
            data: { breadcrumb: 'Usuarios' },
          },
          {
            path: 'users/:id',
            loadComponent: () =>
              import('./admin/users/user-detail.component').then((m) => m.UserDetailComponent),
            data: { breadcrumb: 'Detalhe de usuario' },
          },
        ],
      },
    ],
  },
];
