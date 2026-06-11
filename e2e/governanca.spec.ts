import { expect, test, type Page } from '@playwright/test';

// Smoke da governanca (F-Sprint 12) em MSW/dev-offline, sem backend real. Cobre os fluxos de
// leitura ADMIN-only que funcionam offline: landing Administracao, lista/detalhe de parametros
// com historico, e a secao de roles no detalhe de usuario. As mutacoes (alterar roles/parametro)
// exigem step-up (MFA) e ficam para o smoke real (step 112.6.4), nao aqui.
const FINANCEIRO_ID = '1f0799c0-98b9-6d9d-bc4a-7d6f5b771003';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('NG_APP_USE_MSW', 'true'));
});

async function loginAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/e-mail/i).fill('admin@empresa.com');
  await page.getByLabel(/^senha$/i).fill('123456');
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL(/\/app\/dashboard/, { timeout: 10_000 });
}

test('landing Administracao mostra os cards de Usuarios e Parametros', async ({ page }) => {
  await loginAdmin(page);

  await page.goto('/app/admin');
  await expect(page.getByRole('link', { name: /Usuarios/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Parametros operacionais/ })).toBeVisible();
});

test('lista de parametros abre o detalhe com historico de versoes', async ({ page }) => {
  await loginAdmin(page);

  await page.goto('/app/admin/parametros');
  await expect(page.getByText('credito.valor.maximo.pf')).toBeVisible();

  await page.goto('/app/admin/parametros/credito.score.pre-aprovacao');
  await expect(page.getByText('Historico de versoes')).toBeVisible();
  await expect(page.getByText('v3')).toBeVisible();
});

test('detalhe de usuario mostra a secao de roles e a nota de auditoria', async ({ page }) => {
  await loginAdmin(page);

  await page.goto(`/app/admin/users/${FINANCEIRO_ID}`);
  await expect(page.getByText('Roles cumulativas')).toBeVisible();
  await expect(page.getByText(/Alteracoes de roles sao auditadas no backend/)).toBeVisible();
});
