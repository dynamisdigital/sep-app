import { expect, test, type Page } from '@playwright/test';

// Smoke da jornada Pix operacional (F-Sprint 13) em MSW/dev-offline, sem backend real. Cobre os
// fluxos de leitura/navegacao que funcionam offline: area Pix, formulario de desembolso por role,
// detalhe/status de desembolso, referencia com copia-cola, recebimento conciliado e divergencias
// ligadas ao backoffice. A solicitacao de desembolso exige step-up (MFA/TOTP) e fica para o smoke
// real (step 113.6.3), nao aqui.
const TRANSFERENCIA_CONCLUIDA_ID = 'e0000000-0000-4000-8000-000000000001';
const REFERENCIA_ATIVA_ID = 'e1000000-0000-4000-8000-000000000001';
const RECEBIMENTO_CONCILIADO_ID = 'e2000000-0000-4000-8000-000000000001';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('NG_APP_USE_MSW', 'true'));
});

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/^senha$/i).fill('123456');
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL(/\/app\/dashboard/, { timeout: 10_000 });
}

test('sidenav mostra Pix para operador interno', async ({ page }) => {
  await login(page, 'financeiro@empresa.com');

  await expect(page.getByRole('link', { name: 'Pix', exact: true })).toBeVisible();
});

test('area Pix mostra os cards de desembolsos, recebimentos e divergencias', async ({ page }) => {
  await login(page, 'admin@empresa.com');

  await page.goto('/app/pix');
  await expect(page.locator('a[href="/app/pix/desembolsos"]')).toBeVisible();
  await expect(page.locator('a[href="/app/pix/recebimentos"]')).toBeVisible();
  await expect(page.locator('a[href="/app/pix/divergencias"]')).toBeVisible();
});

test('FINANCEIRO ve o formulario de novo desembolso e o status de uma transferencia', async ({
  page,
}) => {
  await login(page, 'financeiro@empresa.com');

  await page.goto('/app/pix/desembolsos');
  await expect(page.getByRole('button', { name: /Solicitar desembolso/ })).toBeVisible();

  await page.goto(`/app/pix/desembolsos/${TRANSFERENCIA_CONCLUIDA_ID}`);
  await expect(page.getByText('Concluida')).toBeVisible();
  await expect(page.getByRole('button', { name: /Reconsultar status/ })).toBeVisible();
});

test('BACKOFFICE consulta desembolso mas nao inicia um novo', async ({ page }) => {
  await login(page, 'backoffice@empresa.com');

  await page.goto('/app/pix/desembolsos');
  await expect(page.getByRole('button', { name: /Solicitar desembolso/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Abrir desembolso/ })).toBeVisible();
});

test('referencia Pix mostra status ativo e copia-cola', async ({ page }) => {
  await login(page, 'financeiro@empresa.com');

  await page.goto(`/app/pix/recebimentos/referencias/${REFERENCIA_ATIVA_ID}`);
  await expect(page.getByText('Ativa')).toBeVisible();
  await expect(page.getByText(/br\.gov\.bcb\.pix/)).toBeVisible();
});

test('recebimento conciliado aparece como conciliado', async ({ page }) => {
  await login(page, 'financeiro@empresa.com');

  await page.goto(`/app/pix/recebimentos/${RECEBIMENTO_CONCILIADO_ID}`);
  await expect(page.getByText('Conciliado')).toBeVisible();
});

test('divergencias Pix listam itens e levam ao backoffice', async ({ page }) => {
  await login(page, 'admin@empresa.com');

  await page.goto('/app/pix/divergencias');
  await expect(page.getByText('Recebimento Pix sem referencia identificada')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Tratar no backoffice' }).first()).toBeVisible();
});
