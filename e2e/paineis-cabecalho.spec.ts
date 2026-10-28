import { expect, test, type Page } from '@playwright/test';

// Os dois botões do cabeçalho eram decorativos: o sino trazia o número "6" desenhado dentro do
// PNG e a ajuda não abria nada. Este smoke garante que os dois seguem operacionais.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('NG_APP_USE_MSW', 'true'));
});

async function login(page: Page, username: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/e-mail/i).fill(username);
  await page.getByLabel(/^senha$/i).fill('123456');
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL(/\/app\/dashboard/, { timeout: 15_000 });
}

test('o sino traz alertas derivados do estado real', async ({ page }) => {
  await page.setViewportSize({ width: 1449, height: 1086 });
  await login(page, 'admin@empresa.com');

  await page.locator('.op-notification').click();
  await expect(page.locator('.op-painel')).toBeVisible();

  const alertas = page.locator('.op-alerta');
  await expect(alertas.first()).toBeVisible();
  // Todo alerta declara de onde saiu o número: sem isso o operador não consegue conferir.
  const origens = await page.locator('.op-alerta small').allTextContents();
  expect(origens.every((o) => o.trim().length > 0)).toBe(true);

  // O contador do sino é o total real, e não o "6" que vinha impresso no ícone.
  const badge = await page.locator('.op-badge').textContent();
  expect(Number(badge)).toBe(await alertas.count());
});

test('o alerta leva à tela que o resolve', async ({ page }) => {
  await page.setViewportSize({ width: 1449, height: 1086 });
  await login(page, 'admin@empresa.com');

  await page.locator('.op-notification').click();
  await page.locator('.op-alerta', { hasText: 'na fila' }).first().click();
  await expect(page).toHaveURL(/\/app\/backoffice\/fila/);
  // Navegar fecha o painel.
  await expect(page.locator('.op-painel')).toHaveCount(0);
});

test('a credora não dispara o endpoint de operação', async ({ page }) => {
  const chamadas: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/backoffice/dashboard')) chamadas.push(r.url());
  });
  await page.setViewportSize({ width: 1449, height: 1086 });
  await login(page, 'credora@empresa.com');

  await page.locator('.op-notification').click();
  await expect(page.locator('.op-painel')).toBeVisible();
  expect(chamadas).toHaveLength(0);
});

test('a ajuda fala da tela em que o operador está', async ({ page }) => {
  await page.setViewportSize({ width: 1449, height: 1086 });
  await login(page, 'admin@empresa.com');

  await page.goto('/app/admin/parametros');
  await page.getByRole('button', { name: 'Ajuda' }).click();
  await expect(page.locator('.op-ajuda-contexto h3')).toHaveText('Parâmetros operacionais');

  await page.mouse.click(120, 720);
  await expect(page.locator('.op-painel')).toHaveCount(0);

  await page.goto('/app/backoffice/fila');
  await page.getByRole('button', { name: 'Ajuda' }).click();
  await expect(page.locator('.op-ajuda-contexto h3')).toHaveText('Fila operacional');
  await expect(page.locator('.op-ajuda-links a', { hasText: 'Termos de uso' })).toBeVisible();
});
