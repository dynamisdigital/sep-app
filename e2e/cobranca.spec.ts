import { expect, test, type Page } from '@playwright/test';

// Smoke da jornada de cobranca em modo MSW/dev-offline (sem backend real).
// Cobre o que funciona offline: agenda/detalhe do tomador, recebimento manual do
// financeiro (operacao sensivel, sem step-up) e inadimplencia. A proposta de
// renegociacao exige step-up (MFA) e o aceite/recusa do tomador depende de endpoints
// ainda inexistentes no backend (GET renegociacao + descoberta do id) — validados no
// smoke real (step 109.6.3), nao aqui.
const CONTRATO_ASSINADO_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e03';
const PARCELA_PARA_RECEBIMENTO_ID = 'a0000000-0000-4000-8000-000000000006';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('NG_APP_USE_MSW', 'true'));
});

async function login(page: Page, username = 'admin@empresa.com'): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/e-mail/i).fill(username);
  await page.getByLabel(/^senha$/i).fill('123456');
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL(/\/app\/dashboard/, { timeout: 10_000 });
}

test('tomador: agenda do contrato e detalhe da parcela', async ({ page }) => {
  await login(page);

  await page.goto(`/app/cobranca/contratos/${CONTRATO_ASSINADO_ID}/agenda`);
  await expect(page.getByText('Agenda de cobranca')).toBeVisible();

  await page.getByRole('link', { name: /Parcela 1/ }).click();
  await page.waitForURL(/\/app\/cobranca\/parcelas\/.+/, { timeout: 10_000 });
  await expect(page.getByText('Valor em aberto')).toBeVisible();
});

test('financeiro: registra recebimento manual', async ({ page }) => {
  await login(page, 'financeiro@empresa.com');

  await page.goto(`/app/cobranca/financeiro/parcelas/${PARCELA_PARA_RECEBIMENTO_ID}`);
  await expect(page.getByRole('button', { name: 'Registrar recebimento' })).toBeVisible();

  await page.getByLabel('Valor recebido').fill('500');
  await page.getByLabel('Data do recebimento').fill('2026-06-05T10:00');
  await page.getByRole('button', { name: 'Registrar recebimento' }).click();

  await expect(page.getByText('Recebimentos desta parcela')).toBeVisible({ timeout: 10_000 });
});

test('financeiro: painel de inadimplencia lista parcelas em atraso', async ({ page }) => {
  await login(page, 'financeiro@empresa.com');

  await page.goto('/app/cobranca/financeiro/inadimplencia');
  await expect(page.getByText('Inadimplencia')).toBeVisible();
  await expect(page.getByText('Parcela 2')).toBeVisible();
  await expect(page.getByText('Parcela 6')).toBeVisible();
});
