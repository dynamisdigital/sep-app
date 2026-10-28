import { expect, test, type Page } from '@playwright/test';

// Ciclo da conta escrow dos credores em MSW/dev-offline. O estado do mock vive na memoria da
// pagina e zera a cada carga completa (`page.goto`), entao cada teste cobre um papel e navega
// pelo menu, sem recarregar, para nao perder o que acabou de gravar. O ciclo inteiro entre
// papeis (aporte -> alocacao -> desembolso -> repasse) fica no teste unitario do store; aqui a
// prova e que cada tela funciona de ponta a ponta no navegador.
// Massa: Helena Martins (credora-pf) tem a reserva integral da Padaria Estrela e um aporte Pix
// pendente; Marina Duarte aguarda analise.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('NG_APP_USE_MSW', 'true'));
  await page.setViewportSize({ width: 1440, height: 880 });
});

async function login(page: Page, username: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/e-mail/i).fill(username);
  await page.getByLabel(/^senha$/i).fill('123456');
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL(/\/app\/dashboard/, { timeout: 15_000 });
}

async function irPeloMenu(page: Page, grupo: string, rota: string): Promise<void> {
  await page.locator('.op-nav-group > .op-nav-link', { hasText: grupo }).first().click();
  await page.locator(`a.op-subnav-link[href="${rota}"]`).click();
  await page.waitForURL(new RegExp(`${rota}$`));
}

test('credora confirma um aporte por Pix e o extrato registra o lancamento', async ({ page }) => {
  await login(page, 'credora-pf@empresa.com');
  await irPeloMenu(page, 'Credora', '/app/credora/conta');

  await expect(page.getByRole('heading', { name: 'Conta escrow' })).toBeVisible();
  await expect(page.getByText('Disponível', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /simular pagamento/i }).click();
  await expect(page.getByText('Nenhum aporte aguardando Pix.')).toBeVisible({ timeout: 10_000 });
});

test('credora gera um Pix de aporte', async ({ page }) => {
  await login(page, 'credora-pf@empresa.com');
  await irPeloMenu(page, 'Credora', '/app/credora/conta');

  await page.getByLabel(/valor do aporte/i).fill('500,00');
  await page.getByRole('button', { name: /gerar pix de aporte/i }).click();
  await expect(page.getByText(/pix copia e cola, válido até/i)).toHaveCount(2, {
    timeout: 10_000,
  });
});

test('credora ve a reserva da Padaria Estrela e pode cancelar enquanto reservada', async ({
  page,
}) => {
  await login(page, 'credora-pf@empresa.com');
  await irPeloMenu(page, 'Credora', '/app/credora/alocacoes');

  await expect(page.getByRole('heading', { name: 'Minhas alocações' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Padaria Estrela ME' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancelar' })).toBeVisible();
});

test('credora cadastra a conta de destino e solicita um saque', async ({ page }) => {
  await login(page, 'credora-pf@empresa.com');
  await irPeloMenu(page, 'Credora', '/app/credora/saques');

  await page.getByLabel('Banco').fill('Nubank (260)');
  await page.getByLabel('Agência').fill('0001');
  await page.getByLabel('Conta', { exact: true }).fill('12345-6');
  await page.getByRole('button', { name: /cadastrar conta de destino/i }).click();
  await expect(page.getByLabel('Conta de destino')).toContainText(/ag\. 0001/i, {
    timeout: 10_000,
  });

  await page.getByLabel(/valor \(r\$\)/i).fill('100,00');
  await page.getByRole('button', { name: /solicitar saque/i }).click();
  await expect(page.getByText('Histórico de saques')).toBeVisible();
  await expect(page.getByRole('cell', { name: /R\$\s*100,00/ })).toBeVisible({ timeout: 10_000 });
});

test('tesouraria desembolsa a operacao pronta e repassa a primeira parcela', async ({ page }) => {
  await login(page, 'financeiro@empresa.com');
  await irPeloMenu(page, 'Backoffice', '/app/backoffice/tesouraria');

  await expect(page.getByRole('heading', { name: 'Tesouraria da escrow' })).toBeVisible();
  const linha = page.getByRole('row', { name: /Padaria Estrela ME/ }).first();
  await expect(linha.getByText('Pronta para desembolso')).toBeVisible();

  await linha.getByRole('button', { name: 'Desembolsar' }).click();
  await expect(page.getByRole('button', { name: 'Repassar parcela 1' })).toBeVisible({
    timeout: 10_000,
  });

  await page.getByRole('button', { name: 'Repassar parcela 1' }).click();
  await expect(page.getByRole('button', { name: 'Repassar parcela 2' })).toBeVisible({
    timeout: 10_000,
  });
});

test('backoffice aprova o cadastro de um credor em analise e depois o suspende', async ({
  page,
}) => {
  await login(page, 'backoffice@empresa.com');
  await irPeloMenu(page, 'Backoffice', '/app/backoffice/credores');

  await expect(page.getByRole('heading', { name: 'Credores' })).toBeVisible();
  await page
    .getByRole('row', { name: /Marina Duarte/ })
    .getByRole('link', { name: 'Abrir' })
    .click();
  await page.waitForURL(/\/app\/backoffice\/credores\/[^/]+$/);

  await page.getByLabel('Motivo da decisão').fill('Documentação conferida.');
  await page.getByRole('button', { name: 'Aprovar cadastro' }).click();
  await expect(page.getByRole('button', { name: 'Suspender' })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Aprovar cadastro' })).toHaveCount(0);
});

test('o papel decide quem ve as telas da escrow no menu', async ({ page }) => {
  await login(page, 'financeiro@empresa.com');
  await page.locator('.op-nav-group > .op-nav-link', { hasText: 'Backoffice' }).first().click();
  await expect(page.locator('a.op-subnav-link[href="/app/backoffice/tesouraria"]')).toBeVisible();
});
