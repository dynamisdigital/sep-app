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
        path: 'profile/setup-totp',
        loadComponent: () =>
          import('./profile/setup-totp/setup-totp.component').then((m) => m.SetupTotpComponent),
        data: { breadcrumb: 'Habilitar MFA' },
      },
      {
        path: 'step-up',
        loadComponent: () => import('./step-up/step-up.component').then((m) => m.StepUpComponent),
        data: { breadcrumb: 'Confirmacao adicional' },
      },
      {
        path: 'onboarding',
        loadChildren: () =>
          import('./onboarding/onboarding.routes').then((m) => m.ONBOARDING_ROUTES),
        data: { breadcrumb: 'Onboarding' },
      },
      {
        path: 'credito',
        loadChildren: () => import('./credito/credito.routes').then((m) => m.CREDITO_ROUTES),
        data: { breadcrumb: 'Credito' },
      },
      {
        path: 'formalizacao',
        loadChildren: () =>
          import('./formalizacao/formalizacao.routes').then((m) => m.FORMALIZACAO_ROUTES),
        data: { breadcrumb: 'Formalizacao' },
      },
      {
        path: 'cobranca',
        loadChildren: () => import('./cobranca/cobranca.routes').then((m) => m.COBRANCA_ROUTES),
        data: { breadcrumb: 'Cobranca' },
      },
      {
        path: 'pix',
        canActivate: [roleGuard],
        data: { roles: ['FINANCEIRO', 'ADMIN', 'BACKOFFICE'], breadcrumb: 'Pix' },
        loadChildren: () => import('./pix/pix.routes').then((m) => m.PIX_ROUTES),
      },
      {
        path: 'backoffice',
        canActivate: [roleGuard],
        data: { roles: ['BACKOFFICE', 'FINANCEIRO', 'ADMIN'], breadcrumb: 'Backoffice' },
        loadChildren: () =>
          import('./backoffice/backoffice.routes').then((m) => m.BACKOFFICE_ROUTES),
      },
      {
        path: 'admin',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'], breadcrumb: 'Administracao' },
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () =>
              import('./admin/admin-home.component').then((m) => m.AdminHomeComponent),
          },
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
          {
            path: 'parametros',
            loadComponent: () =>
              import('./admin/parametros/parametros-page.component').then(
                (m) => m.ParametrosPageComponent,
              ),
            data: { breadcrumb: 'Parametros' },
          },
          {
            path: 'parametros/:chave',
            loadComponent: () =>
              import('./admin/parametros/parametro-detail-page.component').then(
                (m) => m.ParametroDetailPageComponent,
              ),
            data: { breadcrumb: 'Detalhe do parametro' },
          },
        ],
      },
    ],
  },
];
