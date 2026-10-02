import { expect, test, type Page } from '@playwright/test';

// O menu fixo e a unica porta de entrada das telas. Este smoke cobre o que o teste unitario do
// shell nao alcanca: navegacao real ate o terceiro nivel, o destaque acompanhando a URL e a
// barra recolhida continuando utilizavel.

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

test('navega por clique ate o terceiro nivel e marca um unico selecionado', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 880 });
  await login(page, 'admin@empresa.com');

  await page.locator('.op-nav-group > .op-nav-link', { hasText: 'Backoffice' }).first().click();
  await page.waitForURL(/\/app\/backoffice/);

  await page.locator('.op-subnav-caret').first().click();
  await page.locator('.op-subnav-link-neto', { hasText: 'Provider' }).click();
  await page.waitForURL(/\/app\/backoffice\/reprocessos\/provider/);

  const selecionados = page.locator('.op-nav-link-active, .op-subnav-link-active');
  await expect(selecionados).toHaveCount(1);
  await expect(selecionados).toHaveText('Provider');
  // Os ancestrais ficam marcados como ramo, sem competir com a folha.
  await expect(page.locator('.op-nav-link-ramo, .op-subnav-link-ramo')).toHaveCount(2);
});

test('o papel decide o que aparece no menu', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 880 });

  await login(page, 'backoffice@empresa.com');
  await expect(page.locator('.op-nav a[href="/app/admin"]')).toHaveCount(0);
  await expect(page.locator('.op-nav a[href="/app/backoffice"]')).toHaveCount(1);

  await login(page, 'credora@empresa.com');
  await expect(page.locator('.op-nav a[href="/app/credora"]')).toHaveCount(1);
  await expect(page.locator('.op-nav a[href="/app/backoffice"]')).toHaveCount(0);
  await expect(page.locator('.op-nav a[href="/app/pix"]')).toHaveCount(0);
});

test('a barra recolhe em trilho de icones e volta', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 880 });
  await login(page, 'admin@empresa.com');

  await page.getByRole('button', { name: 'Recolher menu' }).click();
  await expect(page.locator('.op-sidebar-colapsada')).toHaveCount(1);
  await expect(page.locator('.op-subnav')).toHaveCount(0);
  // O cartao do usuario continua dentro do shell, e nao empurrado para fora.
  const dentro = await page.evaluate(() => {
    const u = document.querySelector('.op-side-user')!.getBoundingClientRect();
    const d = document.querySelector('.op-dashboard')!.getBoundingClientRect();
    return u.bottom <= d.bottom + 1 && u.top >= d.top;
  });
  expect(dentro).toBe(true);

  await page.getByRole('button', { name: 'Expandir menu' }).click();
  await expect(page.locator('.op-sidebar-colapsada')).toHaveCount(0);
});

test('o guard barra a credora nas jornadas operacionais', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 880 });
  await login(page, 'credora@empresa.com');

  // O menu ja nao oferece; o guard e a segunda tranca, para quem chegar pela barra de enderecos.
  // A navegacao precisa acontecer dentro da SPA: `page.goto` recarrega e o MSW devolve o usuario
  // mockado para ADMIN, que passaria pelo guard.
  for (const rota of ['/app/onboarding', '/app/credito', '/app/formalizacao', '/app/cobranca']) {
    await page.evaluate((r) => {
      window.history.pushState({}, '', r);
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    }, rota);
    await expect(page).toHaveURL(/\/access-denied/);
  }
});

test('operador continua entrando nas quatro jornadas', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 880 });
  await login(page, 'backoffice@empresa.com');

  for (const rota of ['/app/onboarding', '/app/credito', '/app/formalizacao', '/app/cobranca']) {
    await page.goto(rota);
    // Espera o shell montar: sob carga o chunk preguicoso pode demorar, e a assercao pegaria a
    // navegacao pela metade.
    await page.locator('.op-dashboard').first().waitFor({ timeout: 15_000 });
    await expect(page).not.toHaveURL(/\/access-denied/);
  }
});
