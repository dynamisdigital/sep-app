import './test-polyfills';

import '@angular/compiler';
import '@analogjs/vitest-angular/setup-zone';
import '@testing-library/jest-dom/vitest';

import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from './mocks/server';

getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting(), {
  teardown: { destroyAfterEach: true },
});

// MSW server: handlers cobrem POST /auth/login, POST /usuarios, GET /auth/me (PRD §21).
// `error` continua valendo para a API: uma chamada sem handler e defeito de teste. A excecao e o
// embed do mapa na tela de Contato, que e um recurso externo do proprio HTML e nao uma chamada da
// aplicacao — o happy-dom tenta busca-lo e o MSW reclamaria em toda execucao.
beforeAll(() =>
  server.listen({
    onUnhandledRequest: (request, print) => {
      if (new URL(request.url).hostname.endsWith('google.com')) return;
      print.error();
    },
  }),
);
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
