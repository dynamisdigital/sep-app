import { Routes } from '@angular/router';

// Rotas filhas de /app/onboarding.
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
  {
    path: 'empresa',
    loadComponent: () =>
      import('./empresa/onboarding-empresa-page.component').then(
        (m) => m.OnboardingEmpresaPageComponent,
      ),
    data: { breadcrumb: 'Empresa' },
  },
  {
    path: 'empresa/:id',
    loadComponent: () =>
      import('./empresa/onboarding-empresa-page.component').then(
        (m) => m.OnboardingEmpresaPageComponent,
      ),
    data: { breadcrumb: 'Empresa' },
  },
];
