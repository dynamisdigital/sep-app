import { Routes } from '@angular/router';

import { credoraPresenceGuard } from '../../../core/guards/credora-presence.guard';
import { roleGuard } from '../../../core/guards/role.guard';

// Rotas filhas de /app/credora (jornada credora, Epic 10 / backend Sprints 16-17). A autenticacao e
// herdada do authGuard do shell autenticado (rota pai). O cadastro e acessivel sem credora; perfil,
// oportunidades e carteira exigem credora cadastrada (credoraPresenceGuard redireciona ao cadastro
// no 404).
//
// F-18 separa duas personas no mesmo modulo: as rotas operacionais de matching/aporte sao de
// FINANCEIRO/ADMIN (roleGuard, sem credoraPresenceGuard — operador nao possui credora); as demais
// permanecem da persona CLIENTE com presenca de credora.
export const CREDORA_ROUTES: Routes = [
  {
    path: 'matching',
    canActivate: [roleGuard],
    data: { roles: ['FINANCEIRO', 'ADMIN'], breadcrumb: 'Matching de credoras' },
    loadComponent: () =>
      import('./pages/matching-sugestoes-page.component').then(
        (m) => m.MatchingSugestoesPageComponent,
      ),
  },
  {
    path: '',
    loadComponent: () => import('./credora-shell.component').then((m) => m.CredoraShellComponent),
  },
  {
    path: 'cadastro',
    loadComponent: () =>
      import('./pages/credora-cadastro-page.component').then((m) => m.CredoraCadastroPageComponent),
    data: { breadcrumb: 'Cadastro' },
  },
  {
    path: 'perfil',
    canActivate: [credoraPresenceGuard],
    loadComponent: () =>
      import('./pages/credora-perfil-page.component').then((m) => m.CredoraPerfilPageComponent),
    data: { breadcrumb: 'Perfil' },
  },
  {
    path: 'oportunidades',
    canActivate: [credoraPresenceGuard],
    loadComponent: () =>
      import('./pages/oportunidades-page.component').then((m) => m.OportunidadesPageComponent),
    data: { breadcrumb: 'Oportunidades' },
  },
  {
    path: 'oportunidades/:id',
    canActivate: [credoraPresenceGuard],
    loadComponent: () =>
      import('./pages/oportunidade-detail-page.component').then(
        (m) => m.OportunidadeDetailPageComponent,
      ),
    data: { breadcrumb: 'Detalhe da oportunidade' },
  },
  {
    path: 'carteira',
    canActivate: [credoraPresenceGuard],
    loadComponent: () =>
      import('./pages/carteira-page.component').then((m) => m.CarteiraPageComponent),
    data: { breadcrumb: 'Carteira' },
  },
  {
    path: 'carteira/:id',
    canActivate: [credoraPresenceGuard],
    loadComponent: () =>
      import('./pages/operacao-carteira-detail-page.component').then(
        (m) => m.OperacaoCarteiraDetailPageComponent,
      ),
    data: { breadcrumb: 'Detalhe da operacao' },
  },
];
