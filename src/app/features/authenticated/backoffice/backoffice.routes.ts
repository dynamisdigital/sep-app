import { Routes } from '@angular/router';

// Rotas filhas de /app/backoffice. O route group e protegido por roleGuard
// (BACKOFFICE/FINANCEIRO/ADMIN) em authenticated.routes.ts; a seguranca real permanece no
// backend (@PreAuthorize). As telas de dashboard (F-10.3), fila (F-10.4) e reprocessos
// (F-10.6) sao adicionadas como rotas filhas na Task que as entrega.
export const BACKOFFICE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./backoffice-shell.component').then((m) => m.BackofficeShellComponent),
  },
];
