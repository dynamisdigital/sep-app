import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';

async function prepare(): Promise<void> {
  // MSW dispara em 2 cenarios:
  // - environment.useMsw=true (build configuracao dev-offline)
  // - localStorage.NG_APP_USE_MSW='true' (override em dev sem mudar build)
  // - localhost/127.0.0.1 (login e jornadas locais de teste sem backend real)
  const mswOverride =
    typeof window !== 'undefined' ? window.localStorage?.getItem('NG_APP_USE_MSW') : null;
  const isLocalTestHost =
    typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);

  if (
    mswOverride !== 'false' &&
    (environment.useMsw || mswOverride === 'true' || isLocalTestHost)
  ) {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }
}

prepare().then(() => bootstrapApplication(App, appConfig).catch((err) => console.error(err)));
