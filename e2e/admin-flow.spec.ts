import { expect, test } from '@playwright/test';

import { defaultPassword, uniqueEmail } from './fixtures/users';

async function cadastrarUsuario(
  page: import('@playwright/test').Page,
  email: string,
  role: 'ADMIN' | 'CLIENTE',
) {
  await page.goto('/register');
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/^senha$/i).fill(defaultPassword);
  await page.getByLabel(/perfil/i).selectOption(role);
  await page.getByRole('button', { name: /criar|cadastrar|registrar/i }).click();
  await page.waitForURL(/\/login/, { timeout: 10_000 });
}

async function logar(page: import('@playwright/test').Page, email: string, senha: string) {
  await page.goto('/login');
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/^senha$/i).fill(senha);
  await page.getByRole('button', { name: /entrar/i }).click();
}

test('ADMIN: lista usuarios e abre detalhe', async ({ page }) => {
  const adminEmail = uniqueEmail('admin');
  await cadastrarUsuario(page, adminEmail, 'ADMIN');

  await logar(page, adminEmail, defaultPassword);
  await page.waitForURL(/\/app\/dashboard/, { timeout: 10_000 });

  await page.getByRole('link', { name: 'Administracao', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/admin\/users$/);

  await expect(page.getByRole('table')).toBeVisible();

  await page.getByLabel(/filtrar por e-mail/i).fill(adminEmail);

  await page.getByRole('link', { name: new RegExp(`ver detalhe de ${adminEmail}`, 'i') }).click();
  await expect(page).toHaveURL(/\/app\/admin\/users\//);
  const detailMain = page.getByRole('main');
  await expect(detailMain.getByText(adminEmail)).toBeVisible();
  await expect(detailMain.getByText('ADMIN').first()).toBeVisible();
  await expect(detailMain.getByText(/criado em/i)).toBeVisible();
});

test('CLIENTE: tentar acessar /app/admin/users cai em /access-denied', async ({ page }) => {
  const clienteEmail = uniqueEmail('cliente-acesso');
  await cadastrarUsuario(page, clienteEmail, 'CLIENTE');

  await logar(page, clienteEmail, defaultPassword);
  await page.waitForURL(/\/app\/dashboard/, { timeout: 10_000 });

  await page.goto('/app/admin/users');
  await page.waitForURL(/\/access-denied/, { timeout: 10_000 });
});
