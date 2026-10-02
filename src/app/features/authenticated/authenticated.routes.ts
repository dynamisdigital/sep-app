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
        data: { breadcrumb: 'Dashboard', immersive: true },
      },
      {
        path: 'profile',
        loadComponent: () => import('./profile/profile.component').then((m) => m.ProfileComponent),
        data: { breadcrumb: 'Meu perfil', immersive: true },
      },
      {
        path: 'profile/change-password',
        loadComponent: () =>
          import('./profile/change-password/change-password.component').then(
            (m) => m.ChangePasswordComponent,
          ),
        data: { breadcrumb: 'Alterar senha', immersive: true },
      },
      {
        path: 'profile/setup-totp',
        loadComponent: () =>
          import('./profile/setup-totp/setup-totp.component').then((m) => m.SetupTotpComponent),
        data: { breadcrumb: 'Habilitar MFA (TOTP)', immersive: true },
      },
      {
        path: 'step-up',
        loadComponent: () => import('./step-up/step-up.component').then((m) => m.StepUpComponent),
        data: { breadcrumb: 'Confirmação adicional', immersive: true },
      },
      {
        // As quatro jornadas abaixo sao trabalho de operacao: o onboarding e de tomadores, a
        // esteira de credito, a formalizacao e a cobranca tambem. A credora (CLIENTE) tem a
        // propria jornada em /app/credora e nao passa por aqui.
        path: 'onboarding',
        canActivate: [roleGuard],
        data: { roles: ['BACKOFFICE', 'FINANCEIRO', 'ADMIN'], breadcrumb: 'Onboarding' },
        loadChildren: () =>
          import('./onboarding/onboarding.routes').then((m) => m.ONBOARDING_ROUTES),
      },
      {
        path: 'credito',
        canActivate: [roleGuard],
        data: { roles: ['BACKOFFICE', 'FINANCEIRO', 'ADMIN'], breadcrumb: 'Crédito' },
        loadChildren: () => import('./credito/credito.routes').then((m) => m.CREDITO_ROUTES),
      },
      {
        path: 'formalizacao',
        canActivate: [roleGuard],
        data: { roles: ['BACKOFFICE', 'FINANCEIRO', 'ADMIN'], breadcrumb: 'Formalização' },
        loadChildren: () =>
          import('./formalizacao/formalizacao.routes').then((m) => m.FORMALIZACAO_ROUTES),
      },
      {
        path: 'cobranca',
        canActivate: [roleGuard],
        data: { roles: ['BACKOFFICE', 'FINANCEIRO', 'ADMIN'], breadcrumb: 'Cobrança' },
        loadChildren: () => import('./cobranca/cobranca.routes').then((m) => m.COBRANCA_ROUTES),
      },
      {
        path: 'credora',
        loadChildren: () => import('./credora/credora.routes').then((m) => m.CREDORA_ROUTES),
        data: { breadcrumb: 'Credora' },
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
        data: { roles: ['ADMIN'], breadcrumb: 'Administração' },
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () =>
              import('./admin/admin-home.component').then((m) => m.AdminHomeComponent),
            data: { immersive: true },
          },
          {
            path: 'users',
            loadComponent: () =>
              import('./admin/users/users-list.component').then((m) => m.UsersListComponent),
            data: { breadcrumb: 'Usuários', immersive: true },
          },
          {
            // Antes de 'users/:id': senao "novo" seria lido como id.
            path: 'users/novo',
            loadComponent: () =>
              import('./admin/users/user-create.component').then((m) => m.UserCreateComponent),
            data: { breadcrumb: 'Novo usuário', immersive: true },
          },
          {
            path: 'users/:id',
            loadComponent: () =>
              import('./admin/users/user-detail.component').then((m) => m.UserDetailComponent),
            data: { breadcrumb: 'Detalhe de usuário', immersive: true },
          },
          {
            path: 'parametros',
            loadComponent: () =>
              import('./admin/parametros/parametros-page.component').then(
                (m) => m.ParametrosPageComponent,
              ),
            data: { breadcrumb: 'Parâmetros', immersive: true },
          },
          {
            path: 'parametros/:chave',
            loadComponent: () =>
              import('./admin/parametros/parametro-detail-page.component').then(
                (m) => m.ParametroDetailPageComponent,
              ),
            data: { breadcrumb: 'Detalhe do parâmetro', immersive: true },
          },
        ],
      },
    ],
  },
];
