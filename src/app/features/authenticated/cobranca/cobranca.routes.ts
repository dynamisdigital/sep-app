import { Routes } from '@angular/router';

// Rotas filhas de /app/cobranca. A entrada do tomador parte de um contrato
// assinado (agenda por contratoId, Task F-9.3); as telas financeiras (agenda,
// recebimentos, inadimplencia) e a renegociacao entram nas Tasks F-9.4/F-9.5.
// Nao existe endpoint de lista global de agendas no backend.
export const COBRANCA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./cobranca-shell.component').then((m) => m.CobrancaShellComponent),
  },
];
