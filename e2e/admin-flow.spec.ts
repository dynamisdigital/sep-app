import { expect, test, type Page } from '@playwright/test';

import { defaultPassword } from './fixtures/users';

// O cadastro público de usuário saiu do produto na Sprint 5 (`/register` virou redirect por
// perfil), então estes fluxos passaram a usar as contas do dev-offline em vez de criar uma conta.
const ADMIN = 'admin@empresa.com';
// `cliente@empresa.com` existe na base de usuarios mas nao e uma conta de login do dev-offline;
// a credora e a conta CLIENTE que entra de fato.
const CLIENTE = 'credora@empresa.com';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('NG_APP_USE_MSW', 'true'));
});

async function logar(page: Page, email: string, senha = defaultPassword) {
  await page.goto('/login');
  await page.locator('#login-username').fill(email);
  await page.locator('#login-password').fill(senha);
  await page.getByRole('button', { name: /entrar na plataforma/i }).click();
  await page.waitForURL(/\/app\//, { timeout: 15_000 });
}

test('ADMIN: lista usuarios e abre detalhe', async ({ page }) => {
  await logar(page, ADMIN);

  // O menu leva a landing de Administracao (Mockup 37); a lista fica no modulo Usuarios.
  await page.locator('.op-nav-link[href="/app/admin"]').click();
  await expect(page).toHaveURL(/\/app\/admin$/);
  await page.locator('.px37-modulos .px37-modulo:nth-child(1) .px37-modulo-btn').click();
  await expect(page).toHaveURL(/\/app\/admin\/users$/);

  await expect(page.getByRole('table')).toBeVisible();

  await page.getByLabel(/filtrar por e-mail/i).fill(ADMIN);
  await expect(page.locator('.px38-tabela-wrap tbody tr')).toHaveCount(1);

  await page.getByRole('link', { name: new RegExp(`ver detalhe de ${ADMIN}`, 'i') }).click();
  await expect(page).toHaveURL(/\/app\/admin\/users\//);
  // O e-mail tambem aparece no cabecalho e no cartao do usuario do shell, entao a assercao usa os
  // seletores da propria tela de detalhe.
  await expect(page.locator('.px39-dados dd', { hasText: ADMIN })).toBeVisible();
  await expect(page.locator('.px39-selo', { hasText: 'ADMIN' }).first()).toBeVisible();
  await expect(page.locator('.px39-dados dt', { hasText: /criado em/i })).toBeVisible();
});

// A negativa por papel nao e observavel no dev-offline: `page.goto` recarrega a pagina, o
// `currentMockUser` do MSW volta a ADMIN e o guard passa a ver um administrador. O que da para
// verificar offline e que a area administrativa nao e oferecida ao cliente, nem no menu nem no
// dashboard. O 403 real fica para o smoke contra backend.
test('CLIENTE: nao recebe acesso a area administrativa', async ({ page }) => {
  await logar(page, CLIENTE);

  await expect(page.locator('.op-nav-link[href="/app/admin"]')).toHaveCount(0);
  await expect(page.locator('.px48-no[href="/app/admin"]')).toHaveCount(0);
});
