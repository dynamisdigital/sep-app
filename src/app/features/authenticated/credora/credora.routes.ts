import { Routes } from '@angular/router';

import { credoraPresenceGuard } from '../../../core/guards/credora-presence.guard';

// Rotas filhas de /app/credora (jornada credora, Epic 10 / backend Sprints 16-17). A autenticacao e
// herdada do authGuard do shell autenticado (rota pai). O cadastro e acessivel sem credora; perfil,
// oportunidades e carteira exigem credora cadastrada (credoraPresenceGuard redireciona ao cadastro
// no 404). Oportunidades e carteira ainda usam o placeholder ate as Tasks F-11.4 a F-11.6.
const carregarPlaceholder = () =>
  import('./credora-placeholder-page.component').then((m) => m.CredoraPlaceholderPageComponent);

export const CREDORA_ROUTES: Routes = [
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
    loadComponent: carregarPlaceholder,
    data: { breadcrumb: 'Oportunidades' },
  },
  {
    path: 'oportunidades/:id',
    canActivate: [credoraPresenceGuard],
    loadComponent: carregarPlaceholder,
    data: { breadcrumb: 'Detalhe da oportunidade' },
  },
  {
    path: 'carteira',
    canActivate: [credoraPresenceGuard],
    loadComponent: carregarPlaceholder,
    data: { breadcrumb: 'Carteira' },
  },
  {
    path: 'carteira/:id',
    canActivate: [credoraPresenceGuard],
    loadComponent: carregarPlaceholder,
    data: { breadcrumb: 'Detalhe da operacao' },
  },
];
