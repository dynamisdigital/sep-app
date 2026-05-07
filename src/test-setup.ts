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
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
