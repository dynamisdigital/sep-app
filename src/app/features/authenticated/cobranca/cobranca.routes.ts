import { Routes } from '@angular/router';

import { roleGuard } from '../../../core/guards/role.guard';

// Rotas filhas de /app/cobranca. A entrada do tomador parte de um contrato
// assinado (agenda por contratoId, Task F-9.3); as rotas financeiras ja existem
// e sao protegidas por roleGuard (FINANCEIRO/ADMIN), mas o conteudo real entra
// nas Tasks F-9.4 (agenda/recebimentos) e F-9.5 (inadimplencia). A seguranca real
// permanece no backend; o guard aqui e visibilidade/UX.
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
  {
    path: 'financeiro/agenda',
    canActivate: [roleGuard],
    data: { roles: ['FINANCEIRO', 'ADMIN'], breadcrumb: 'Agenda financeira' },
    loadComponent: () =>
      import('./cobranca-em-preparacao.component').then((m) => m.CobrancaEmPreparacaoComponent),
  },
  {
    path: 'financeiro/inadimplencia',
    canActivate: [roleGuard],
    data: { roles: ['FINANCEIRO', 'ADMIN'], breadcrumb: 'Inadimplencia' },
    loadComponent: () =>
      import('./cobranca-em-preparacao.component').then((m) => m.CobrancaEmPreparacaoComponent),
  },
];
