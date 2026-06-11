import { Routes } from '@angular/router';

// Rotas filhas de /app/pix (jornada Pix operacional interna). O guard de area
// (FINANCEIRO/ADMIN/BACKOFFICE) fica na rota pai em authenticated.routes.ts; a seguranca real
// e do backend e o roleGuard aqui e visibilidade/UX. As sub-rotas operacionais entram nas Tasks
// donas: desembolsos (F-13.3), recebimentos (F-13.4) e divergencias (F-13.5).
export const PIX_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pix-shell.component').then((m) => m.PixShellComponent),
  },
  {
    path: 'desembolsos',
    loadComponent: () =>
      import('./pages/desembolsos-page.component').then((m) => m.DesembolsosPageComponent),
    data: { breadcrumb: 'Desembolsos' },
  },
  {
    path: 'desembolsos/:id',
    loadComponent: () =>
      import('./pages/desembolso-detail-page.component').then(
        (m) => m.DesembolsoDetailPageComponent,
      ),
    data: { breadcrumb: 'Desembolso' },
  },
  {
    path: 'recebimentos',
    loadComponent: () =>
      import('./pages/recebimentos-page.component').then((m) => m.RecebimentosPageComponent),
    data: { breadcrumb: 'Recebimentos' },
  },
  {
    path: 'recebimentos/referencias/:id',
    loadComponent: () =>
      import('./pages/referencia-detail-page.component').then(
        (m) => m.ReferenciaDetailPageComponent,
      ),
    data: { breadcrumb: 'Referencia' },
  },
  {
    path: 'recebimentos/:id',
    loadComponent: () =>
      import('./pages/recebimento-detail-page.component').then(
        (m) => m.RecebimentoDetailPageComponent,
      ),
    data: { breadcrumb: 'Recebimento' },
  },
  {
    path: 'divergencias',
    loadComponent: () =>
      import('./pages/divergencias-page.component').then((m) => m.DivergenciasPageComponent),
    data: { breadcrumb: 'Divergencias' },
  },
];
