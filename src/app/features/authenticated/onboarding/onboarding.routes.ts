import { Routes } from '@angular/router';

// Rotas filhas de /app/onboarding. Os fluxos PF (pessoa) e PJ (empresa) entram
// nas proximas tasks (F-6.3/F-6.4); aqui fica apenas a home da jornada.
export const ONBOARDING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./onboarding-home.component').then((m) => m.OnboardingHomeComponent),
  },
];
