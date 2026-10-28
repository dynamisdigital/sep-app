/**
 * SEP — Frontend
 *
 * Frontend Development:
 * Daniel Möllmann
 *
 * Angular • TypeScript • SCSS
 * 2026
 */

import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./features/public/public.routes').then((m) => m.PUBLIC_ROUTES),
  },
  {
    path: 'app',
    loadChildren: () =>
      import('./features/authenticated/authenticated.routes').then((m) => m.AUTHENTICATED_ROUTES),
  },
  {
    // A tela pressupoe sessao: e o destino do roleGuard e do 403 do interceptor, e mostra o papel
    // corrente para explicar a recusa. Sem authGuard, quem digitasse a URL sem sessao veria o
    // shell com um usuario que nao e o dele.
    path: 'access-denied',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/error/access-denied.component').then((m) => m.AccessDeniedComponent),
  },
  {
    path: 'design-system',
    loadChildren: () =>
      import('./features/design-system/design-system.routes').then((m) => m.DESIGN_SYSTEM_ROUTES),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
