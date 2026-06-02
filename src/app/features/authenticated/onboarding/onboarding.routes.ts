import { Routes } from '@angular/router';

// Rotas filhas de /app/onboarding. O fluxo PJ (empresa) entra na proxima task (F-6.4).
export const ONBOARDING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./onboarding-home.component').then((m) => m.OnboardingHomeComponent),
  },
  {
    path: 'pessoa',
    loadComponent: () =>
      import('./pessoa/onboarding-pessoa-page.component').then(
        (m) => m.OnboardingPessoaPageComponent,
      ),
    data: { breadcrumb: 'Pessoa fisica' },
  },
  {
    path: 'pessoa/:id',
    loadComponent: () =>
      import('./pessoa/onboarding-pessoa-page.component').then(
        (m) => m.OnboardingPessoaPageComponent,
      ),
    data: { breadcrumb: 'Pessoa fisica' },
  },
];
