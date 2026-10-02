import { Routes } from '@angular/router';

import { roleGuard } from '../../../core/guards/role.guard';

// Rotas filhas de /app/cobranca. A entrada do tomador parte de um contrato assinado
// (agenda por contratoId, Task F-9.3); as rotas financeiras sao protegidas por roleGuard
// (FINANCEIRO/ADMIN). A seguranca real permanece no backend; o guard aqui e visibilidade/UX.
// Nao existe endpoint de lista global de agendas no backend.
export const COBRANCA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./cobranca-shell.component').then((m) => m.CobrancaShellComponent),
    data: { immersive: true },
  },
  {
    path: 'contratos/:contratoId/agenda',
    loadComponent: () =>
      import('./pages/agenda-tomador-page.component').then((m) => m.AgendaTomadorPageComponent),
    data: { breadcrumb: 'Agenda', immersive: true },
  },
  {
    path: 'parcelas/:id',
    loadComponent: () =>
      import('./pages/parcela-detail-page.component').then((m) => m.ParcelaDetailPageComponent),
    data: { breadcrumb: 'Parcela', immersive: true },
  },
  {
    path: 'financeiro/agenda',
    canActivate: [roleGuard],
    data: { roles: ['FINANCEIRO', 'ADMIN'], breadcrumb: 'Agenda financeira', immersive: true },
    loadComponent: () =>
      import('./pages/agenda-financeira-page.component').then(
        (m) => m.AgendaFinanceiraPageComponent,
      ),
  },
  {
    path: 'financeiro/parcelas/:id',
    canActivate: [roleGuard],
    data: { roles: ['FINANCEIRO', 'ADMIN'], breadcrumb: 'Parcela', immersive: true },
    loadComponent: () =>
      import('./pages/parcela-financeira-page.component').then(
        (m) => m.ParcelaFinanceiraPageComponent,
      ),
  },
  {
    path: 'financeiro/inadimplencia',
    canActivate: [roleGuard],
    data: { roles: ['FINANCEIRO', 'ADMIN'], breadcrumb: 'Inadimplência', immersive: true },
    loadComponent: () =>
      import('./pages/inadimplencia-page.component').then((m) => m.InadimplenciaPageComponent),
  },
];
