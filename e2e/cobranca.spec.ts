import { expect, test, type Page } from '@playwright/test';

// Smoke da jornada de cobranca em modo MSW/dev-offline (sem backend real).
// Cobre o que funciona offline: agenda/detalhe do tomador, recebimento manual do
// financeiro (operacao sensivel, sem step-up) e inadimplencia. A proposta de
// renegociacao e o aceite exigem step-up (MFA), entao seguem fora deste smoke — validados
// no smoke real (step 109.6.3). A descoberta do id ja e possivel por
// GET /cobranca/renegociacoes, que passou a existir para o painel da carteira.
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
  await expect(page.getByRole('heading', { name: /Agenda do contrato 5b771c05/ })).toBeVisible();
  // Contrato de R$ 3.125,00 em 10 parcelas: recebido e em aberto fecham no contratado.
  await expect(page.locator('.px32-tabela-wrap tbody tr')).toHaveCount(10);

  await page.getByRole('link', { name: '1 de 10' }).click();
  await page.waitForURL(/\/app\/cobranca\/financeiro\/parcelas\/.+/, { timeout: 10_000 });
  await expect(page.getByText('Valor em aberto')).toBeVisible();
});

test('financeiro: registra recebimento manual', async ({ page }) => {
  await login(page, 'financeiro@empresa.com');

  await page.goto(`/app/cobranca/financeiro/parcelas/${PARCELA_PARA_RECEBIMENTO_ID}`);
  // Dois botões levam o mesmo rótulo no Mockup 31: o do cartão de estado, que apenas foca
  // o formulário, e o submit do próprio formulário.
  await expect(page.locator('.px31-form-receb button[type="submit"]')).toBeEnabled();

  // O campo passou a ter mascara monetaria: os digitos entram como centavos, entao "50000"
  // e R$ 500,00. O FormControl guarda o canonico "500.00" que vai para a API.
  await page.getByLabel('Valor recebido').fill('50000');
  await page.getByLabel('Data do recebimento').fill('2026-06-05T10:00');
  await page.locator('.px31-form-receb button[type="submit"]').click();

  // O lançamento entra na trilha da parcela, junto com os marcos vindos do backend.
  await expect(page.getByText(/Recebimento de R\$\s500,00/)).toBeVisible({ timeout: 10_000 });
});

test('financeiro: painel de inadimplencia lista parcelas em atraso', async ({ page }) => {
  await login(page, 'financeiro@empresa.com');

  await page.goto('/app/cobranca/financeiro/inadimplencia');
  await expect(page.getByRole('heading', { name: 'Parcelas inadimplentes' })).toBeVisible();
  // As cinco parcelas em atraso dos dois contratos atrasados da carteira somam os
  // R$ 2.287,60 (com juros) que a Cobranca e a agenda do contrato tambem mostram.
  await expect(page.locator('.px30-tabela-wrap tbody tr')).toHaveCount(5);
  await expect(page.getByRole('link', { name: 'Parcela 7/10' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Parcela 9/10' }).first()).toBeVisible();
  await expect(page.locator('.px30-metrica strong').first()).toHaveText(/R\$\s2\.287,60/);
});

test('tomador: parcela EM_NEGOCIACAO leva aos termos completos da proposta', async ({ page }) => {
  await login(page, 'tomador@empresa.com');

  await page.goto(`/app/cobranca/parcelas/${PARCELA_EM_NEGOCIACAO_ID}`);
  await page.getByRole('link', { name: /Ver proposta de renegocia(ç|c)(ã|a)o/ }).click();
  await page.waitForURL(/\/renegociacao$/, { timeout: 10_000 });

  await expect(page.getByRole('heading', { name: 'Proposta de renegociação' })).toBeVisible();
  await expect(page.getByText('Novo valor por parcela')).toBeVisible();
  await expect(page.getByText('Valor total renegociado')).toBeVisible();
  await expect(page.getByText(/1\.700,00/)).toBeVisible();
  await expect(page.getByText('Válida até')).toBeVisible();
});

test('tomador: recusa a proposta sem passar por step-up', async ({ page }) => {
  await login(page, 'tomador@empresa.com');

  await page.goto(`/app/cobranca/parcelas/${PARCELA_RECUSA_TOMADOR_ID}/renegociacao`);
  await expect(page.getByRole('heading', { name: 'Proposta de renegociação' })).toBeVisible();

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
  await expect(page.getByRole('heading', { name: 'Proposta de renegociação' })).toBeVisible();
  await expect(page.getByText(/Proposta aceita/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Aceitar proposta' })).toBeEnabled();
});
