import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:4200',
    // O aviso de cookies reserva 10rem no rodape do body e cobre o ultimo elemento da pagina: as
    // specs que medem altura ou clicam no rodape partem com ele dispensado. Quem testa o proprio
    // aviso desfaz isto com `test.use` (ver `aviso-cookies.spec.ts`).
    storageState: {
      cookies: [],
      origins: [
        {
          origin: 'http://localhost:4200',
          localStorage: [{ name: 'SEP_AVISO_COOKIES', value: '1' }],
        },
      ],
    },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run start -- --port 4200',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
