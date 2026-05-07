import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';

async function prepare(): Promise<void> {
  // MSW dispara em 2 cenarios:
  // - environment.useMsw=true (build configuracao dev-offline)
  // - localStorage.NG_APP_USE_MSW='true' (override em dev sem mudar build)
  const forceMsw =
    typeof window !== 'undefined' && window.localStorage?.getItem('NG_APP_USE_MSW') === 'true';

  if (environment.useMsw || forceMsw) {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }
}

prepare().then(() => bootstrapApplication(App, appConfig).catch((err) => console.error(err)));
