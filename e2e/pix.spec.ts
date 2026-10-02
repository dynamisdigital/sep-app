import { expect, test, type Page } from '@playwright/test';

// Smoke da jornada Pix operacional (F-Sprint 13) em MSW/dev-offline, sem backend real. Cobre os
// fluxos de leitura/navegacao que funcionam offline: area Pix, formulario de desembolso por role,
// detalhe/status de desembolso, referencia com copia-cola, recebimento conciliado e divergencias
// ligadas ao backoffice. A solicitacao de desembolso exige step-up (MFA/TOTP) e fica para o smoke
// real (step 113.6.3), nao aqui.
const TRANSFERENCIA_CONCLUIDA_ID = 'e0000000-0000-4000-8000-000000000001';
const REFERENCIA_ATIVA_ID = 'e1000000-0000-4000-8000-000000000001';
const RECEBIMENTO_CONCILIADO_ID = 'e2000000-0000-4000-8000-000000000001';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('NG_APP_USE_MSW', 'true'));
});

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/^senha$/i).fill('123456');
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL(/\/app\/dashboard/, { timeout: 10_000 });
}

// Telas com regra por papel precisam ser abertas por clique. Um `page.goto` recarrega a
// pagina, o MSW reinicia o modulo e o usuario corrente do mock volta ao padrao (ADMIN),
// o que faria qualquer assercao de papel passar por engano.
async function irParaDesembolsos(page: Page): Promise<void> {
  await page.locator('a[href="/app/pix"]').first().click();
  await page.waitForURL(/\/app\/pix$/);
  await page.locator('a.px20-metric[href="/app/pix/desembolsos"]').click();
  await page.waitForURL(/\/app\/pix\/desembolsos$/);
  await page.locator('.px21-heading h1').waitFor();
}

// O menu do shell operacional traz o item com o contador ao lado, entao a assercao e pelo proprio
// link do menu, e nao pelo nome acessivel exato.
test('menu mostra Pix para operador interno', async ({ page }) => {
  await login(page, 'financeiro@empresa.com');

  await expect(page.locator('.op-nav-link', { hasText: 'Pix' })).toBeVisible();
  await expect(page.locator('.op-nav-link[href="/app/pix"]')).toBeVisible();
});

test('menu esconde Pix e Backoffice do cliente', async ({ page }) => {
  await login(page, 'credora@empresa.com');

  await expect(page.locator('.op-nav-link[href="/app/pix"]')).toHaveCount(0);
  await expect(page.locator('.op-nav-link[href="/app/backoffice"]')).toHaveCount(0);
  await expect(page.locator('.op-nav-link[href="/app/credora"]')).toBeVisible();
});

test('area Pix mostra os cards de desembolsos, recebimentos e divergencias', async ({ page }) => {
  await login(page, 'admin@empresa.com');

  await page.goto('/app/pix');
  // A tela repete as rotas no cartao de metrica e no rodape ("Ver relatorio completo"),
  // entao o cartao precisa ser identificado pela propria classe.
  await expect(page.locator('a.px20-metric[href="/app/pix/desembolsos"]')).toBeVisible();
  await expect(page.locator('a.px20-metric[href="/app/pix/recebimentos"]')).toBeVisible();
  await expect(page.locator('a.px20-metric[href="/app/pix/divergencias"]')).toBeVisible();
});

test('FINANCEIRO ve o formulario de novo desembolso e o status de uma transferencia', async ({
  page,
}) => {
  await login(page, 'financeiro@empresa.com');

  await irParaDesembolsos(page);
  // O formulario sensivel vive num modal: a entrada fica no cabecalho e so aparece
  // para quem pode solicitar.
  await page.getByRole('button', { name: 'Solicitar desembolso' }).click();
  await expect(page.getByRole('dialog', { name: 'Novo desembolso' })).toBeVisible();
  await expect(
    page.getByRole('dialog').getByRole('button', { name: /Solicitar desembolso/ }),
  ).toBeVisible();

  // Detalhe do desembolso (Mockup 27): o status aparece no selo do titulo e a reconsulta
  // e uma das acoes rapidas da coluna lateral.
  await page.goto(`/app/pix/desembolsos/${TRANSFERENCIA_CONCLUIDA_ID}`);
  await expect(page.locator('h1 .px27-selo-head')).toHaveText('Concluída');
  await expect(page.getByRole('button', { name: /Reconsultar no provider/ })).toBeVisible();
});

test('BACKOFFICE consulta desembolso mas nao inicia um novo', async ({ page }) => {
  await login(page, 'backoffice@empresa.com');

  await irParaDesembolsos(page);
  // A consulta continua disponivel: o botao "Abrir desembolso" virou "Consultar" no Mockup 21.
  await expect(page.getByRole('button', { name: /Consultar/ })).toBeVisible();
  // So depois de a tela estar montada a ausencia do botao sensivel significa alguma coisa.
  await expect(page.getByRole('button', { name: /Solicitar desembolso/ })).toHaveCount(0);
});

test('referencia Pix mostra status ativo e copia-cola', async ({ page }) => {
  await login(page, 'financeiro@empresa.com');

  await page.goto(`/app/pix/recebimentos/referencias/${REFERENCIA_ATIVA_ID}`);
  // O status se repete no selo do titulo e no campo Status; o codigo copia-cola aparece
  // no campo e tambem na acao rapida. Ancorar cada assercao no seu proprio elemento.
  await expect(page.locator('h1 .px26-selo-head')).toHaveText('Ativa');
  await expect(page.locator('.px26-copia-cola-text')).toContainText('br.gov.bcb.pix');
});

test('recebimento conciliado aparece como conciliado', async ({ page }) => {
  await login(page, 'financeiro@empresa.com');

  await page.goto(`/app/pix/recebimentos/${RECEBIMENTO_CONCILIADO_ID}`);
  // O status aparece no selo do titulo e se repete no resumo e na linha do tempo.
  await expect(page.locator('h1 .px25-selo')).toHaveText('Conciliado');
});

test('divergencias Pix listam itens e levam ao backoffice', async ({ page }) => {
  await login(page, 'admin@empresa.com');

  await page.goto('/app/pix/divergencias');
  await expect(page.getByText('Recebimento Pix sem referencia identificada')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Tratar no backoffice' }).first()).toBeVisible();
});

// Estado de erro do painel. `?mock_erro=fila-pix:once` e o mesmo link usado para conferir a tela
// no navegador: falha na primeira carga e o proprio "Tentar novamente" devolve o estado normal.
test('divergencias Pix mostram o painel de erro e voltam pelo retry', async ({ page }) => {
  await login(page, 'admin@empresa.com');

  await page.goto('/app/pix/divergencias?mock_erro=fila-pix:once');
  await expect(page.getByRole('button', { name: /Tentar novamente/ })).toBeVisible();
  await expect(page.locator('.px23-error-detalhe')).toContainText(
    'Erro ao obter dados do provider Pix. Timeout excedido.',
  );
  await expect(page.locator('.px23-tentativa .px23-selo')).toHaveText('Falha');

  await page.getByRole('button', { name: /Tentar novamente/ }).click();
  await expect(page.getByText('Recebimento Pix sem referencia identificada')).toBeVisible();
  await expect(page.locator('.px23-tentativa .px23-selo')).toHaveText('Sucesso');
});
