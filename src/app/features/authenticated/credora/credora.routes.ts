import { Routes } from '@angular/router';

import { credoraPresenceGuard } from '../../../core/guards/credora-presence.guard';

// Rotas filhas de /app/credora (jornada credora, Epic 10 / backend Sprints 16-17). A autenticacao e
// herdada do authGuard do shell autenticado (rota pai). O cadastro e acessivel sem credora; perfil,
// oportunidades e carteira exigem credora cadastrada (credoraPresenceGuard redireciona ao cadastro
// no 404).
export const CREDORA_ROUTES: Routes = [
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
];
