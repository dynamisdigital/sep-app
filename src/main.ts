/**
 * SEP — Frontend
 *
 * Frontend Development:
 * Daniel Möllmann
 *
 * Angular • TypeScript • SCSS
 * 2026
 */

import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';
import { ehAmbienteDemo } from './app/core/env/ambiente';
import { environment } from './environments/environment';
import { iniciarMocks } from './mocks/iniciar-mocks';

async function prepare(): Promise<void> {
  // MSW dispara fora de producao em 3 cenarios (ver ehAmbienteDemo):
  // - environment.useMsw=true (build configuracao dev-offline)
  // - localStorage.NG_APP_USE_MSW='true' (override em dev sem mudar build)
  // - localhost/127.0.0.1 (login e jornadas locais de teste sem backend real)
  // No build de producao nunca: nem o override por localStorage liga o mock. (SEC-02)
  if (ehAmbienteDemo()) {
    await iniciarMocks();
  }
}

prepare().then(() =>
  bootstrapApplication(App, appConfig).catch((err) => {
    // Em producao o detalhe tecnico nao vai para o console do usuario. (SEC-14)
    if (!environment.production) console.error(err);
  }),
);
