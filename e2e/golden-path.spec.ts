import { expect, test } from '@playwright/test';

import { changedPassword, defaultPassword } from './fixtures/users';

// Caminho feliz de ponta a ponta em MSW/dev-offline. O passo de autocadastro saiu do teste
// porque a rota `/register` foi removida no Sprint 5: no SEP quem cria usuario e a
// Administracao, e o operador entra com a conta que recebeu.
const CONTA = 'credora@empresa.com';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('NG_APP_USE_MSW', 'true'));
});

test('CLIENTE: login -> perfil -> alterar senha -> relogar', async ({ page }) => {
  // As telas do SEP sao desenhadas para desktop operacional; no viewport padrao do Playwright
  // (1280x720) o rodape fixo cobre o rodape do formulario.
  await page.setViewportSize({ width: 1440, height: 900 });

  // 1. autenticar
  await page.goto('/login');
  await page.getByLabel(/e-mail/i).fill(CONTA);
  await page.getByLabel(/^senha$/i).fill(defaultPassword);
  await page.getByRole('button', { name: /entrar/i }).click();

  // 2. dashboard
  await page.waitForURL(/\/app\/dashboard/, { timeout: 10_000 });

  // 3. abrir Meu perfil pelo menu
  await page.getByRole('link', { name: 'Meu perfil', exact: true }).first().click();
  await expect(page).toHaveURL(/\/app\/profile$/);

  // 4. confirmar e-mail e papel no cartao de identidade (o e-mail tambem aparece no cabecalho
  // e na barra lateral, por isso a assercao e presa ao cartao).
  const identidade = page.locator('.profile-identity, .profile-panel').first();
  await expect(identidade.getByText(CONTA).first()).toBeVisible();
  await expect(page.locator('.profile-page').getByText('CLIENTE').first()).toBeVisible();

  // 5. abrir Alterar senha
  await page
    .getByRole('link', { name: /alterar senha/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/app\/profile\/change-password/);

  // 6. alterar senha
  // Cada campo tem ao lado um botao "Mostrar ou ocultar <campo>": o seletor por id evita casar
  // com o aria-label desse botao.
  await page.locator('#passwordAtual').fill(defaultPassword);
  await page.locator('#novaSenha').fill(changedPassword);
  await page.locator('#confirmacaoNovaSenha').fill(changedPassword);
  await page.getByRole('button', { name: /salvar nova senha/i }).click();
  await expect(page.getByRole('status')).toContainText(/sucesso/i);

  // 7. sair (a acao mora no menu da conta, no cabecalho)
  await page.getByRole('button', { name: 'Menu da conta' }).click();
  await page.getByRole('menuitem', { name: /Sair da conta/ }).click();
  await page.waitForURL(/\/login/, { timeout: 10_000 });

  // 8. entrar com a nova senha
  await page.getByLabel(/e-mail/i).fill(CONTA);
  await page.getByLabel(/^senha$/i).fill(changedPassword);
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL(/\/app\/dashboard/, { timeout: 10_000 });
});
