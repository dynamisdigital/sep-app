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
  },
  {
    path: 'contratos/:contratoId/agenda',
    loadComponent: () =>
      import('./pages/agenda-tomador-page.component').then((m) => m.AgendaTomadorPageComponent),
    data: { breadcrumb: 'Agenda' },
  },
  {
    path: 'parcelas/:id',
    loadComponent: () =>
      import('./pages/parcela-detail-page.component').then((m) => m.ParcelaDetailPageComponent),
    data: { breadcrumb: 'Parcela' },
  },
  // Decisao do tomador sobre a renegociacao ativa (F-16). Sem guard de ownership no
  // front: o backend responde 403 uniforme para parcela alheia/inexistente.
  {
    path: 'parcelas/:parcelaId/renegociacao',
    loadComponent: () =>
      import('./pages/renegociacao-tomador-page.component').then(
        (m) => m.RenegociacaoTomadorPageComponent,
      ),
    data: { breadcrumb: 'Renegociacao' },
  },
  {
    path: 'financeiro/agenda',
    canActivate: [roleGuard],
    data: { roles: ['FINANCEIRO', 'ADMIN'], breadcrumb: 'Agenda financeira' },
    loadComponent: () =>
      import('./pages/agenda-financeira-page.component').then(
        (m) => m.AgendaFinanceiraPageComponent,
      ),
  },
  {
    path: 'financeiro/parcelas/:id',
    canActivate: [roleGuard],
    data: { roles: ['FINANCEIRO', 'ADMIN'], breadcrumb: 'Parcela' },
    loadComponent: () =>
      import('./pages/parcela-financeira-page.component').then(
        (m) => m.ParcelaFinanceiraPageComponent,
      ),
  },
  {
    path: 'financeiro/inadimplencia',
    canActivate: [roleGuard],
    data: { roles: ['FINANCEIRO', 'ADMIN'], breadcrumb: 'Inadimplencia' },
    loadComponent: () =>
      import('./pages/inadimplencia-page.component').then((m) => m.InadimplenciaPageComponent),
  },
];
