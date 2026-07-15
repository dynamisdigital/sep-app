import { expect, test, type Page } from '@playwright/test';

// Smoke da jornada de cobranca em modo MSW/dev-offline (sem backend real).
// Cobre o que funciona offline: agenda/detalhe do tomador, recebimento manual do
// financeiro (operacao sensivel, sem step-up), inadimplencia e a decisao de
// renegociacao do tomador (F-16): termos da proposta ativa, recusa sem step-up e
// aceite navegando ao step-up sem aceitar automaticamente no retorno. O aceite com
// token TOTP real exige o desafio MFA (sem handler offline) e fica para o smoke real
// (step 116.6.4), como nas demais jornadas sensiveis.
const CONTRATO_ASSINADO_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e03';
const PARCELA_PARA_RECEBIMENTO_ID = 'a0000000-0000-4000-8000-000000000006';
const PARCELA_EM_NEGOCIACAO_ID = 'a0000000-0000-4000-8000-000000000008';
const PARCELA_RECUSA_TOMADOR_ID = 'a0000000-0000-4000-8000-00000000000a';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('NG_APP_USE_MSW', 'true'));
});

async function login(page: Page, username = 'admin@empresa.com'): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/e-mail/i).fill(username);
  await page.getByLabel(/^senha$/i).fill('123456');
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL(/\/app\/dashboard/, { timeout: 10_000 });
}

test('tomador: agenda do contrato e detalhe da parcela', async ({ page }) => {
  await login(page);

  await page.goto(`/app/cobranca/contratos/${CONTRATO_ASSINADO_ID}/agenda`);
  await expect(page.getByText('Agenda de cobranca')).toBeVisible();

  await page.getByRole('link', { name: /Parcela 1/ }).click();
  await page.waitForURL(/\/app\/cobranca\/parcelas\/.+/, { timeout: 10_000 });
  await expect(page.getByText('Valor em aberto')).toBeVisible();
});

test('financeiro: registra recebimento manual', async ({ page }) => {
  await login(page, 'financeiro@empresa.com');

  await page.goto(`/app/cobranca/financeiro/parcelas/${PARCELA_PARA_RECEBIMENTO_ID}`);
  await expect(page.getByRole('button', { name: 'Registrar recebimento' })).toBeVisible();

  await page.getByLabel('Valor recebido').fill('500');
  await page.getByLabel('Data do recebimento').fill('2026-06-05T10:00');
  await page.getByRole('button', { name: 'Registrar recebimento' }).click();

  await expect(page.getByText('Recebimentos desta parcela')).toBeVisible({ timeout: 10_000 });
});

test('financeiro: painel de inadimplencia lista parcelas em atraso', async ({ page }) => {
  await login(page, 'financeiro@empresa.com');

  await page.goto('/app/cobranca/financeiro/inadimplencia');
  await expect(page.getByRole('heading', { name: 'Inadimplencia' })).toBeVisible();
  await expect(page.getByText('Parcela 2')).toBeVisible();
  await expect(page.getByText('Parcela 6')).toBeVisible();
});

test('tomador: parcela EM_NEGOCIACAO leva aos termos completos da proposta', async ({ page }) => {
  await login(page, 'tomador@empresa.com');

  await page.goto(`/app/cobranca/parcelas/${PARCELA_EM_NEGOCIACAO_ID}`);
  await page.getByRole('link', { name: /Ver proposta de renegociacao/ }).click();
  await page.waitForURL(/\/renegociacao$/, { timeout: 10_000 });

  await expect(page.getByRole('heading', { name: 'Proposta de renegociacao' })).toBeVisible();
  await expect(page.getByText('Novo valor por parcela')).toBeVisible();
  await expect(page.getByText('Valor total renegociado')).toBeVisible();
  await expect(page.getByText(/1\.700,00/)).toBeVisible();
  await expect(page.getByText('Valida ate')).toBeVisible();
});

test('tomador: recusa a proposta sem passar por step-up', async ({ page }) => {
  await login(page, 'tomador@empresa.com');

  await page.goto(`/app/cobranca/parcelas/${PARCELA_RECUSA_TOMADOR_ID}/renegociacao`);
  await expect(page.getByRole('heading', { name: 'Proposta de renegociacao' })).toBeVisible();

  await page.getByRole('button', { name: 'Recusar proposta' }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar recusa' }).click();

  await expect(page.getByText(/Proposta recusada/)).toBeVisible({ timeout: 10_000 });
  expect(page.url()).not.toContain('/app/step-up');
});

test('tomador: aceite sem token navega ao step-up e o retorno nao aceita automaticamente', async ({
  page,
}) => {
  await login(page, 'tomador@empresa.com');

  await page.goto(`/app/cobranca/parcelas/${PARCELA_EM_NEGOCIACAO_ID}/renegociacao`);
  await page.getByRole('button', { name: 'Aceitar proposta' }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar aceite' }).click();

  await page.waitForURL(/\/app\/step-up\?next=/, { timeout: 10_000 });

  // Retorno sem completar o desafio: a tela volta aos termos e exige novo gesto —
  // nenhum aceite automatico acontece com a navegacao.
  await page.goBack();
  await page.waitForURL(/\/renegociacao$/, { timeout: 10_000 });
  await expect(page.getByRole('heading', { name: 'Proposta de renegociacao' })).toBeVisible();
  await expect(page.getByText(/Proposta aceita/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Aceitar proposta' })).toBeEnabled();
});
