import { expect, test } from '@playwright/test';

import { changedPassword } from './fixtures/users';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('NG_APP_USE_MSW', 'true'));
});

test('CLIENTE: canalizacao -> login -> perfil -> alterar senha -> logout', async ({ page }) => {
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'Como cadastrar sua conta' })).toBeVisible();
  await expect(page.getByText(/baixe o aplicativo SEP/i)).toBeVisible();

  await page.getByRole('link', { name: /fazer login/i }).click();
  await page.getByLabel(/e-mail/i).fill('credora@empresa.com');
  await page.getByLabel(/^senha$/i).fill('123456');
  await page.getByRole('button', { name: /entrar/i }).click();

  await page.waitForURL(/\/app\/dashboard/, { timeout: 10_000 });
  await expect(page.getByText(/ola, credora@empresa.com/i)).toBeVisible();

  await page.getByRole('link', { name: 'Meu perfil', exact: true }).first().click();
  await expect(page).toHaveURL('http://localhost:4200/app/profile');
  const profileMain = page.getByRole('main');
  await expect(profileMain.getByText('credora@empresa.com')).toBeVisible();
  await expect(profileMain.getByText('CLIENTE').first()).toBeVisible();

  await page
    .getByRole('link', { name: /alterar senha/i })
    .first()
    .click();
  await page.getByLabel(/senha atual/i).fill('123456');
  await page.getByLabel(/^nova senha$/i).fill(changedPassword);
  await page.getByLabel(/confirme a nova senha/i).fill(changedPassword);
  await page.getByRole('button', { name: /salvar nova senha/i }).click();
  await expect(page.getByRole('status')).toContainText(/sucesso/i);

  await page.getByRole('button', { name: /sair/i }).click();
  await page.waitForURL(/\/login/, { timeout: 10_000 });
});
