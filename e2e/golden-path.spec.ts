import { expect, test } from '@playwright/test';

import { changedPassword, defaultPassword, uniqueEmail } from './fixtures/users';

test('CLIENTE: cadastro -> login -> perfil -> alterar senha -> relogar', async ({ page }) => {
  const email = uniqueEmail('cliente');

  // 1. landing
  await page.goto('/');

  // 2. abrir cadastro
  await page
    .getByRole('link', { name: /criar conta|cadastrar/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/register/);

  // 3. cadastro CLIENTE
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/^senha$/i).fill(defaultPassword);
  await page.getByLabel(/perfil/i).selectOption('CLIENTE');
  await page.getByRole('button', { name: /criar|cadastrar|registrar/i }).click();

  // 4. ir para login
  await page.waitForURL(/\/login/, { timeout: 10_000 });

  // 5. autenticar
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/^senha$/i).fill(defaultPassword);
  await page.getByRole('button', { name: /entrar/i }).click();

  // 6. dashboard
  await page.waitForURL(/\/app\/dashboard/, { timeout: 10_000 });
  await expect(page.getByText(new RegExp(`ola, ${email}`, 'i'))).toBeVisible();

  // 7. abrir Meu perfil
  await page.getByRole('link', { name: 'Meu perfil', exact: true }).first().click();
  await expect(page).toHaveURL(/\/app\/profile$/);

  // 8. confirmar e-mail e role
  const profileMain = page.getByRole('main');
  await expect(profileMain.getByText(email)).toBeVisible();
  await expect(profileMain.getByText('CLIENTE').first()).toBeVisible();

  // 9. abrir Alterar senha
  await page
    .getByRole('link', { name: /alterar senha/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/app\/profile\/change-password/);

  // 10. alterar senha
  await page.getByLabel(/senha atual/i).fill(defaultPassword);
  await page.getByLabel(/^nova senha$/i).fill(changedPassword);
  await page.getByLabel(/confirme a nova senha/i).fill(changedPassword);
  await page.getByRole('button', { name: /salvar nova senha/i }).click();
  await expect(page.getByRole('status')).toContainText(/sucesso/i);

  // 11. logout
  await page.getByRole('button', { name: /sair/i }).click();
  await page.waitForURL(/\/login/, { timeout: 10_000 });

  // 12. login com nova senha
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/^senha$/i).fill(changedPassword);
  await page.getByRole('button', { name: /entrar/i }).click();

  // 13. dashboard novamente
  await page.waitForURL(/\/app\/dashboard/, { timeout: 10_000 });
  await expect(page.getByText(new RegExp(`ola, ${email}`, 'i'))).toBeVisible();
});
