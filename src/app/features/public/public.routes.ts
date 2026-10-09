import { Routes } from '@angular/router';

export const PUBLIC_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./landing/landing.component').then((m) => m.LandingComponent),
  },
  // ============ SITE INSTITUCIONAL ============
  // Antes o menu da landing apontava para âncoras da propria pagina, e "Privacidade" e
  // "Termos de uso" iam para `/` sem fragmento. Cada item agora tem tela propria.
  {
    path: 'credito-pj',
    loadComponent: () =>
      import('./credito-pj/credito-pj.component').then((m) => m.CreditoPjComponent),
    title: 'Para empresas — Dynamis SEP',
  },
  {
    path: 'investidores',
    loadComponent: () =>
      import('./investidores/investidores.component').then((m) => m.InvestidoresComponent),
    title: 'Para investidores — Dynamis SEP',
  },
  {
    path: 'transparencia',
    loadComponent: () =>
      import('./transparencia/transparencia.component').then((m) => m.TransparenciaComponent),
    title: 'Transparência — Dynamis SEP',
  },
  {
    path: 'perguntas-frequentes',
    loadComponent: () =>
      import('./perguntas-frequentes/perguntas-frequentes.component').then(
        (m) => m.PerguntasFrequentesComponent,
      ),
    title: 'Perguntas frequentes — Dynamis SEP',
  },
  {
    path: 'antifraude',
    loadComponent: () =>
      import('./antifraude/antifraude.component').then((m) => m.AntifraudeComponent),
    title: 'Antifraude — Dynamis SEP',
  },
  {
    path: 'blog',
    loadComponent: () => import('./blog/blog.component').then((m) => m.BlogComponent),
    title: 'Blog — Dynamis SEP',
  },
  {
    path: 'blog/:slug',
    loadComponent: () =>
      import('./blog-artigo/blog-artigo.component').then((m) => m.BlogArtigoComponent),
  },
  {
    path: 'seguranca',
    loadComponent: () =>
      import('./seguranca/seguranca.component').then((m) => m.SegurancaComponent),
    title: 'Segurança — Dynamis SEP',
  },
  {
    path: 'como-funciona',
    loadComponent: () =>
      import('./como-funciona/como-funciona.component').then((m) => m.ComoFuncionaComponent),
    title: 'Como funciona — Dynamis SEP',
  },
  {
    path: 'sobre-o-sep',
    loadComponent: () =>
      import('./sobre-o-sep/sobre-o-sep.component').then((m) => m.SobreOSepComponent),
    title: 'Sobre o Dynamis SEP',
  },
  {
    path: 'contato',
    loadComponent: () => import('./contato/contato.component').then((m) => m.ContatoComponent),
    title: 'Contato — Dynamis SEP',
  },
  {
    path: 'termos-de-uso',
    loadComponent: () =>
      import('./termos-de-uso/termos-de-uso.component').then((m) => m.TermosDeUsoComponent),
    title: 'Termos de uso — Dynamis SEP',
  },
  {
    path: 'politica-de-privacidade',
    loadComponent: () =>
      import('./politica-de-privacidade/politica-de-privacidade.component').then(
        (m) => m.PoliticaDePrivacidadeComponent,
      ),
    title: 'Política de privacidade — Dynamis SEP',
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'login/verify-totp',
    loadComponent: () =>
      import('./login/verify-totp/verify-totp.component').then((m) => m.VerifyTotpComponent),
  },
  {
    path: 'account-locked',
    loadComponent: () =>
      import('./account-locked/account-locked.component').then((m) => m.AccountLockedComponent),
  },
  {
    path: 'register',
    // Sprint 5: register publico substituido pela tela de redirect (canalizacao por perfil).
    loadComponent: () =>
      import('./redirect-to-app/redirect-to-app.component').then((m) => m.RedirectToAppComponent),
  },
];
