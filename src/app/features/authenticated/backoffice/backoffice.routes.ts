import { Routes } from '@angular/router';

// Rotas filhas de /app/backoffice. O route group e protegido por roleGuard
// (BACKOFFICE/FINANCEIRO/ADMIN) em authenticated.routes.ts; a seguranca real permanece no
// backend (@PreAuthorize). As telas de dashboard (F-10.3), fila (F-10.4) e reprocessos
// (F-10.6) sao adicionadas como rotas filhas na Task que as entrega.
export const BACKOFFICE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/backoffice-operational-dashboard-page.component').then(
        (m) => m.BackofficeOperationalDashboardPageComponent,
      ),
    data: { breadcrumb: 'Dashboard operacional', immersive: true },
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/backoffice-dashboard-page.component').then(
        (m) => m.BackofficeDashboardPageComponent,
      ),
    data: { breadcrumb: 'Dashboard', immersive: true },
  },
  {
    path: 'fila',
    loadComponent: () =>
      import('./pages/fila-operacional-page.component').then((m) => m.FilaOperacionalPageComponent),
    data: { breadcrumb: 'Fila operacional', immersive: true },
  },
  {
    path: 'fila/:id',
    loadComponent: () =>
      import('./pages/item-fila-detail-page.component').then((m) => m.ItemFilaDetailPageComponent),
    data: { breadcrumb: 'Item da fila', immersive: true },
  },
  {
    path: 'reprocessos',
    loadComponent: () =>
      import('./pages/reprocessos-page.component').then((m) => m.ReprocessosPageComponent),
    data: { breadcrumb: 'Reprocessos', immersive: true },
  },
  // Disparo manual em tela dedicada (Mockup 19). Um componente atende os dois canais; `canal`
  // define a aba ativa, o titulo, o formulario e a permissao exibida, e cada canal tem a sua
  // URL para poder ser aberta direto e voltar do step-up no lugar certo.
  {
    path: 'reprocessos/provider',
    loadComponent: () =>
      import('./pages/reprocessar-provider-page.component').then(
        (m) => m.ReprocessarProviderPageComponent,
      ),
    data: { breadcrumb: 'Provider', immersive: true, canal: 'provider' },
  },
  {
    path: 'reprocessos/webhook',
    loadComponent: () =>
      import('./pages/reprocessar-provider-page.component').then(
        (m) => m.ReprocessarProviderPageComponent,
      ),
    data: { breadcrumb: 'Webhook', immersive: true, canal: 'webhook' },
  },
];
