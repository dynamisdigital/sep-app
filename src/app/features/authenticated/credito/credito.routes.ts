import { Routes } from '@angular/router';

// Rotas filhas de /app/credito. Lista, detalhe, criacao e Open Finance entram
// nas Tasks F-7.3 a F-7.6 conforme os componentes forem implementados.
export const CREDITO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./credito-home.component').then((m) => m.CreditoHomeComponent),
  },
];
