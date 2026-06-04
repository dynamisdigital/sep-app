import { Routes } from '@angular/router';

// Rotas filhas de /app/formalizacao. Nao existe endpoint de lista global de
// contratos no backend: a entrada parte das propostas aprovadas (home) e o
// contrato e resolvido por proposta sob demanda (evita N+1). Leitura completa,
// versoes e aceite entram nas Tasks F-8.3/F-8.4.
export const FORMALIZACAO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./formalizacao-home.component').then((m) => m.FormalizacaoHomeComponent),
  },
  {
    path: 'proposta/:propostaId',
    loadComponent: () => import('./proposta-entry.component').then((m) => m.PropostaEntryComponent),
    data: { breadcrumb: 'Por proposta' },
  },
  {
    path: 'contratos/:id',
    loadComponent: () =>
      import('./contrato-detail.component').then((m) => m.ContratoDetailComponent),
    data: { breadcrumb: 'Contrato' },
  },
];
