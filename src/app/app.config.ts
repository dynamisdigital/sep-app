/**
 * SEP — Frontend
 *
 * Frontend Development:
 * Daniel Möllmann
 *
 * Angular • TypeScript • SCSS
 * 2026
 */

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { routes } from './app.routes';
import { LUCIDE_ICONS } from './core/icons/lucide-icons';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { clientChannelInterceptor } from './core/interceptors/client-channel.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { stepUpInterceptor } from './core/interceptors/step-up.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Página nova abre no topo; ao voltar (seta do navegador ou do site), retoma a posição em que estava.
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
    provideHttpClient(
      withInterceptors([
        clientChannelInterceptor,
        authInterceptor,
        stepUpInterceptor,
        errorInterceptor,
      ]),
    ),
    importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
  ],
};
