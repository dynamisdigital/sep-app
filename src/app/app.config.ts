import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
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
    provideRouter(routes),
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
