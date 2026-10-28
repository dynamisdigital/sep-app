import { expect, test, type Page } from '@playwright/test';

// Open Finance e a entrada da formalização por proposta: as duas últimas telas que ainda viviam
// no shell claro. O smoke cobre o que a reconstrução mudou — moldura, máscara e desfechos.

const OF_AUTORIZADO = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c06';
const OF_PENDENTE = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c05';
const OF_SEM_CONSENTIMENTO = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c01';
const PROPOSTA_SEM_CONTRATO = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c02';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('NG_APP_USE_MSW', 'true'));
});

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/e-mail/i).fill('admin@empresa.com');
  await page.getByLabel(/^senha$/i).fill('123456');
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL(/\/app\/dashboard/, { timeout: 15_000 });
}

test('o consentimento pede o documento com máscara e explica o handoff', async ({ page }) => {
  await page.setViewportSize({ width: 1449, height: 1086 });
  await login(page);
  await page.goto(`/app/credito/propostas/${OF_SEM_CONSENTIMENTO}/open-finance`);

  // A tela agora vive no shell operacional, com menu e rodapé.
  await expect(page.locator('.op-dashboard')).toBeVisible();

  const campo = page.getByLabel('CPF ou CNPJ do titular da conta');
  await campo.fill('52998224725');
  await expect(campo).toHaveValue('529.982.247-25');
  await expect(page.locator('.px58-passos li')).toHaveCount(3);

  await expect(page.getByRole('button', { name: /Iniciar consentimento/ })).toBeEnabled();
});

test('o status autorizado mostra as médias em pt-BR', async ({ page }) => {
  await page.setViewportSize({ width: 1449, height: 1086 });
  await login(page);
  await page.goto(`/app/credito/propostas/${OF_AUTORIZADO}/open-finance`);

  await expect(page.locator('.px58-situacao')).toHaveText('Autorizado');
  const numeros = await page.locator('.px58-numeros dd').allTextContents();
  const limpo = numeros.map((n) => n.replace(/\u00a0/g, ' '));
  expect(limpo).toContain('R$ 18.000,00');
  expect(limpo).toContain('R$ 15.400,00');
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight),
  ).toBe(0);
});

test('o consentimento pendente não oferece novo formulário', async ({ page }) => {
  await page.setViewportSize({ width: 1449, height: 1086 });
  await login(page);
  await page.goto(`/app/credito/propostas/${OF_PENDENTE}/open-finance`);

  await expect(page.locator('.px58-situacao')).toHaveText('Aguardando autorização');
  await expect(page.getByLabel('CPF ou CNPJ do titular da conta')).toHaveCount(0);
});

// Quem volta do provedor não deveria precisar clicar em "Atualizar" para saber se o banco
// confirmou: o status já é consultado na entrada da rota.
test('a rota de retorno consulta o status sozinha', async ({ page }) => {
  await page.setViewportSize({ width: 1449, height: 1086 });
  await login(page);
  await page.goto(`/app/credito/propostas/${OF_AUTORIZADO}/open-finance/retorno`);

  await expect(page.locator('.px58-retorno')).toBeVisible();
  await expect(page.locator('.px58-situacao')).toHaveText('Autorizado');
});

test('proposta sem contrato explica a regra e oferece caminho', async ({ page }) => {
  await page.setViewportSize({ width: 1449, height: 1086 });
  await login(page);
  await page.goto(`/app/formalizacao/proposta/${PROPOSTA_SEM_CONTRATO}`);

  await expect(page.locator('.op-dashboard')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'O contrato ainda não foi gerado' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /Ver a proposta/ })).toHaveAttribute(
    'href',
    `/app/credito/propostas/${PROPOSTA_SEM_CONTRATO}`,
  );
});
