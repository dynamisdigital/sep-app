import { expect, test } from '@playwright/test';

// Smoke da jornada de onboarding em modo MSW/dev-offline (sem backend real).
// MSW e habilitado por sessao via localStorage; login usa o admin mockado.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('NG_APP_USE_MSW', 'true'));
});

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel(/e-mail/i).fill('admin@empresa.com');
  await page.getByLabel(/^senha$/i).fill('123456');
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL(/\/app\/dashboard/, { timeout: 10_000 });
}

test('PF: inicia onboarding e consulta status aprovado', async ({ page }) => {
  await login(page);

  await page.goto('/app/onboarding/pessoa');
  await page.getByLabel('CPF').fill('529.982.247-25');
  await page.getByLabel('Nome completo').fill('Joao da Silva');
  await page.getByLabel('Data de nascimento').fill('1990-01-15');
  await page.getByRole('button', { name: 'Iniciar onboarding' }).click();

  await page.waitForURL(/\/app\/onboarding\/pessoa\/.+/, { timeout: 10_000 });
  await expect(page.getByText('APROVADO_FINAL', { exact: true })).toBeVisible();
});

test('PF: CPF com onboarding ativo mostra conflito (409)', async ({ page }) => {
  await login(page);

  await page.goto('/app/onboarding/pessoa');
  await page.getByLabel('CPF').fill('999.999.999-99');
  await page.getByLabel('Nome completo').fill('Joao da Silva');
  await page.getByLabel('Data de nascimento').fill('1990-01-15');
  await page.getByRole('button', { name: 'Iniciar onboarding' }).click();

  await expect(page.getByText('Este CPF ja possui um onboarding ativo.')).toBeVisible();
});

test('PJ: inicia onboarding e exibe representante com CPF mascarado', async ({ page }) => {
  await login(page);

  await page.goto('/app/onboarding/empresa');
  await page.getByLabel('CNPJ').fill('27.865.757/0001-02');
  await page.getByLabel('Razao social').fill('Acme Comercio LTDA');
  await page.getByRole('button', { name: 'Iniciar onboarding' }).click();

  await page.waitForURL(/\/app\/onboarding\/empresa\/.+/, { timeout: 10_000 });
  await expect(page.getByText('APROVADO_FINAL', { exact: true })).toBeVisible();
  await expect(page.getByText('529****4725')).toBeVisible();
  // LGPD: o CPF completo do representante nunca pode aparecer no web.
  await expect(page.getByText(/\d{3}\.\d{3}\.\d{3}-\d{2}/)).toHaveCount(0);
});
