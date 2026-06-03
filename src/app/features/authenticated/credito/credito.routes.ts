import { Routes } from '@angular/router';

// Rotas filhas de /app/credito. Lista, detalhe, criacao e Open Finance entram
// nas Tasks F-7.3 a F-7.6 conforme os componentes forem implementados.
export const CREDITO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./credito-home.component').then((m) => m.CreditoHomeComponent),
  },
  {
    path: 'propostas',
    loadComponent: () =>
      import('./propostas/propostas-list-page.component').then((m) => m.PropostasListPageComponent),
    data: { breadcrumb: 'Propostas' },
  },
  {
    path: 'propostas/:id',
    loadComponent: () =>
      import('./propostas/proposta-detail-page.component').then(
        (m) => m.PropostaDetailPageComponent,
      ),
    data: { breadcrumb: 'Detalhe da proposta' },
  },
];
