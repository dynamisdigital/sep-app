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
];
