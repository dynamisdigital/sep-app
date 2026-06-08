import { expect, test, type Page } from '@playwright/test';

// Smoke da operacao de backoffice em MSW/dev-offline (sem backend real). Cobre o fluxo que
// funciona offline: dashboard, fila, detalhe, assumir e comentar. resolver/ignorar e os
// reprocessos exigem step-up (MFA) e ficam para o smoke real (step 110.7.3), nao aqui.
const ITEM_ABERTO_ID = 'c0000000-0000-4000-8000-000000000001';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('NG_APP_USE_MSW', 'true'));
});

async function loginBackoffice(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/e-mail/i).fill('backoffice@empresa.com');
  await page.getByLabel(/^senha$/i).fill('123456');
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL(/\/app\/dashboard/, { timeout: 10_000 });
}

test('dashboard operacional carrega os indicadores', async ({ page }) => {
  await loginBackoffice(page);

  await page.goto('/app/backoffice/dashboard');
  await expect(page.getByText('Dashboard operacional')).toBeVisible();
  await expect(page.getByText('Recebimentos do dia')).toBeVisible();
});

test('fila lista itens e abre o detalhe', async ({ page }) => {
  await loginBackoffice(page);

  await page.goto('/app/backoffice/fila');
  await expect(page.getByText('Webhook celcoin/kyc falhou no processamento')).toBeVisible();

  await page.goto(`/app/backoffice/fila/${ITEM_ABERTO_ID}`);
  await expect(page.getByText('Objeto original')).toBeVisible();
});

test('operador assume e comenta um item aberto', async ({ page }) => {
  await loginBackoffice(page);

  await page.goto(`/app/backoffice/fila/${ITEM_ABERTO_ID}`);
  await page.getByRole('button', { name: 'Assumir item' }).click();
  await expect(page.getByText('Em tratamento')).toBeVisible({ timeout: 10_000 });

  await page.getByLabel('Novo comentario').fill('Verificando o evento de webhook.');
  await page.getByRole('button', { name: 'Comentar' }).click();
  await expect(page.getByText('Verificando o evento de webhook.')).toBeVisible({ timeout: 10_000 });
});
