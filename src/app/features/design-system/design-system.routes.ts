import { Routes } from '@angular/router';

import { ShowcaseComponent } from './showcase.component';

export const DESIGN_SYSTEM_ROUTES: Routes = [
  {
    path: '',
    component: ShowcaseComponent,
  },
  {
    path: ':system',
    component: ShowcaseComponent,
  },
];
