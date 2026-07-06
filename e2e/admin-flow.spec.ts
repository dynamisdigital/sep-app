import { expect, test } from '@playwright/test';

async function logar(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login');
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/^senha$/i).fill('123456');
  await page.getByRole('button', { name: /entrar/i }).click();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('NG_APP_USE_MSW', 'true'));
});

test('ADMIN: lista usuarios e abre detalhe', async ({ page }) => {
  const adminEmail = 'admin@empresa.com';
  await logar(page, adminEmail);
  await page.waitForURL(/\/app\/dashboard/, { timeout: 10_000 });

  await page.getByRole('link', { name: 'Administracao', exact: true }).click();
  await expect(page).toHaveURL('http://localhost:4200/app/admin');
  await page.getByRole('link', { name: /Usuarios/ }).click();
  await expect(page).toHaveURL('http://localhost:4200/app/admin/users');

  await expect(page.getByRole('table')).toBeVisible();

  await page.getByLabel(/filtrar por e-mail/i).fill(adminEmail);

  await page.getByRole('link', { name: new RegExp(`ver detalhe de ${adminEmail}`, 'i') }).click();
  await expect(page).toHaveURL(/\/app\/admin\/users\//);
  const detailMain = page.getByRole('main');
  await expect(detailMain.getByText(adminEmail)).toBeVisible();
  await expect(detailMain.getByText('ADMIN').first()).toBeVisible();
  await expect(detailMain.getByText(/criado em/i)).toBeVisible();
});

test('CLIENTE: navegacao administrativa nao e exposta', async ({ page }) => {
  await logar(page, 'credora@empresa.com');
  await page.waitForURL('http://localhost:4200/app/dashboard', { timeout: 10_000 });

  await expect(page.getByRole('link', { name: 'Administracao', exact: true })).toHaveCount(0);
});
