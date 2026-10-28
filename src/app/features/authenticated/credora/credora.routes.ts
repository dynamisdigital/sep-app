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
    path: 'matching/:sugestaoId',
    canActivate: [roleGuard],
    data: { roles: ['FINANCEIRO', 'ADMIN'], breadcrumb: 'Detalhe do matching' },
    loadComponent: () =>
      import('./pages/matching-detail-page.component').then((m) => m.MatchingDetailPageComponent),
  },
  {
    path: 'matching/:sugestaoId/aporte',
    canActivate: [roleGuard],
    data: { roles: ['FINANCEIRO', 'ADMIN'], breadcrumb: 'Aporte da operacao' },
    loadComponent: () =>
      import('./pages/matching-aporte-page.component').then((m) => m.MatchingAportePageComponent),
  },
  {
    path: '',
    loadComponent: () => import('./credora-shell.component').then((m) => m.CredoraShellComponent),
    data: { immersive: true },
  },
  {
    path: 'cadastro',
    loadComponent: () =>
      import('./pages/credora-cadastro-page.component').then((m) => m.CredoraCadastroPageComponent),
    data: { breadcrumb: 'Cadastro', immersive: true },
  },
  {
    path: 'perfil',
    canActivate: [credoraPresenceGuard],
    loadComponent: () =>
      import('./pages/credora-perfil-page.component').then((m) => m.CredoraPerfilPageComponent),
    data: { breadcrumb: 'Perfil', immersive: true },
  },
  {
    path: 'oportunidades',
    canActivate: [credoraPresenceGuard],
    loadComponent: () =>
      import('./pages/oportunidades-page.component').then((m) => m.OportunidadesPageComponent),
    data: { breadcrumb: 'Oportunidades', immersive: true },
  },
  {
    path: 'oportunidades/:id',
    canActivate: [credoraPresenceGuard],
    loadComponent: () =>
      import('./pages/oportunidade-detail-page.component').then(
        (m) => m.OportunidadeDetailPageComponent,
      ),
    data: { breadcrumb: 'Detalhe da oportunidade', immersive: true },
  },
  {
    path: 'carteira',
    canActivate: [credoraPresenceGuard],
    loadComponent: () =>
      import('./pages/carteira-page.component').then((m) => m.CarteiraPageComponent),
    data: { breadcrumb: 'Carteira', immersive: true },
  },
  {
    path: 'carteira/:id',
    canActivate: [credoraPresenceGuard],
    loadComponent: () =>
      import('./pages/operacao-carteira-detail-page.component').then(
        (m) => m.OperacaoCarteiraDetailPageComponent,
      ),
    data: { breadcrumb: 'Detalhe da operacao', immersive: true },
  },
  // Conta escrow do credor (aporte, alocacao e saque). O servidor responde 404 a quem ainda nao tem
  // cadastro de credor; as telas tratam isso e nao exigem credora PJ (o credor pode ser pessoa fisica).
  {
    path: 'conta',
    loadComponent: () =>
      import('./escrow/conta-escrow-page.component').then((m) => m.ContaEscrowPageComponent),
    data: { breadcrumb: 'Conta escrow', immersive: true },
  },
  {
    path: 'alocacoes',
    loadComponent: () =>
      import('./escrow/alocacoes-page.component').then((m) => m.AlocacoesPageComponent),
    data: { breadcrumb: 'Alocações', immersive: true },
  },
  {
    path: 'saques',
    loadComponent: () =>
      import('./escrow/saques-page.component').then((m) => m.SaquesPageComponent),
    data: { breadcrumb: 'Saques', immersive: true },
  },
];
