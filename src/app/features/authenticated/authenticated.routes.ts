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
        path: 'admin',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'], breadcrumb: 'Administracao' },
        loadComponent: () =>
          import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
    ],
  },
];
