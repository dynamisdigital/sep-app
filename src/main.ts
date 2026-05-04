import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

async function prepare(): Promise<void> {
  // MSW so dispara via flag em localStorage para evitar surpresa em builds prod.
  // Para ativar em dev: localStorage.setItem('NG_APP_USE_MSW', 'true') e recarregar.
  if (typeof window !== 'undefined' && window.localStorage?.getItem('NG_APP_USE_MSW') === 'true') {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }
}

prepare().then(() => bootstrapApplication(App, appConfig).catch((err) => console.error(err)));
