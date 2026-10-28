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

// Reconciliado com a landing do Mockup 37: os modulos viraram cartoes com titulo proprio e um
// unico link "Acessar modulo" cada.
test('landing Administracao mostra os modulos de Usuarios e Parametros', async ({ page }) => {
  await loginAdmin(page);

  await page.goto('/app/admin');
  await expect(page.getByRole('heading', { name: 'Usuários' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Parâmetros operacionais' })).toBeVisible();

  const modulos = page.getByRole('link', { name: /Acessar módulo/ });
  await expect(modulos.nth(0)).toHaveAttribute('href', '/app/admin/users');
  await expect(modulos.nth(1)).toHaveAttribute('href', '/app/admin/parametros');

  // O resumo soma as proprias listas devolvidas pelos endpoints da governanca.
  await expect(page.getByText('Usuários ativos')).toBeVisible();
  await expect(page.getByText('sem endpoint de catálogo')).toBeVisible();
});

// Reconciliado com os Mockups 40 e 41: a secao ganhou acentuacao e a versao virou selo, que
// aparece tanto na identidade quanto na trilha.
test('lista de parametros abre o detalhe com historico de versoes', async ({ page }) => {
  await loginAdmin(page);

  await page.goto('/app/admin/parametros');
  await expect(page.getByText('credito.valor.maximo.pf')).toBeVisible();

  await page.goto('/app/admin/parametros/credito.score.pre-aprovacao');
  await expect(page.getByRole('heading', { name: 'Histórico de versões' })).toBeVisible();
  await expect(page.locator('.px41-versao', { hasText: 'v3' }).first()).toBeVisible();
  await expect(page.locator('.px41-tabela-wrap tbody tr')).toHaveCount(2);
});

// Reconciliado com o Mockup 39: a secao passou a se chamar "Roles e permissoes" e as roles sao
// chips no lugar de caixas de selecao.
test('detalhe de usuario mostra a secao de roles e a nota de auditoria', async ({ page }) => {
  await loginAdmin(page);

  await page.goto(`/app/admin/users/${FINANCEIRO_ID}`);
  await expect(page.getByRole('heading', { name: 'Roles e permissões' })).toBeVisible();
  await expect(page.locator('.px39-chip')).toHaveCount(4);
  await expect(page.getByText(/Alterações de roles são auditadas no backend/)).toBeVisible();
});
