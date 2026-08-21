import { Routes } from '@angular/router';

export const PUBLIC_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./landing/landing.component').then((m) => m.LandingComponent),
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
    path: 'politica-de-privacidade',
    loadComponent: () =>
      import('./politica-privacidade/politica-privacidade-page.component').then(
        (m) => m.PoliticaPrivacidadePageComponent,
      ),
  },
  {
    path: 'register',
    // Sprint 5: register publico substituido pela tela de redirect (canalizacao por perfil).
    loadComponent: () =>
      import('./redirect-to-app/redirect-to-app.component').then((m) => m.RedirectToAppComponent),
  },
];
