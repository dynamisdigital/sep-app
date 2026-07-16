import { expect, test, type Page } from '@playwright/test';

// Smoke da jornada de aporte e matching da credora (F-18) em modo MSW/dev-offline (sem backend
// real). Cobre o que funciona offline: fila de sugestoes, detalhe, decisao navegando ao step-up
// SEM decidir automaticamente no retorno, CTA separado de aporte a partir do matching confirmado,
// pagina de aporte com prefill autoritativo e redirecionamento ao step-up sem registro automatico,
// leitura owner-scoped na carteira da credora e bloqueio de role indevida. Decisao e aporte com
// token TOTP real exigem o desafio MFA (sem handler offline) e ficam para o smoke real com
// backend :8080, como nas demais jornadas sensiveis.
const MATCHING_SUGERIDA_ID = '7f0799c0-98b9-6d9d-bc4a-7d6f5b78f001';
const MATCHING_CONFIRMADA_ID = '7f0799c0-98b9-6d9d-bc4a-7d6f5b78f003';
const OPERACAO_CARTEIRA_ID = '7f0799c0-98b9-6d9d-bc4a-7d6f5b78c001';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('NG_APP_USE_MSW', 'true'));
});

async function login(page: Page, username: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/e-mail/i).fill(username);
  await page.getByLabel(/^senha$/i).fill('123456');
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL(/\/app\/dashboard/, { timeout: 10_000 });
}

test('admin: sugestoes -> detalhe -> confirmacao navega ao step-up sem decidir no retorno', async ({
  page,
}) => {
  await login(page, 'admin@empresa.com');

  // Menu operacional visivel e fila de sugestoes com dados do backend (mock).
  await page.getByRole('link', { name: 'Matching de credoras' }).click();
  await page.waitForURL(/\/app\/credora\/matching$/, { timeout: 10_000 });
  await expect(page.getByRole('heading', { name: 'Matching de credoras' })).toBeVisible();
  await expect(page.getByText(/25\.000,00/)).toBeVisible();
  await expect(page.getByText('CONTRATO_ASSINADO').first()).toBeVisible();

  // Detalhe autoritativo da sugestao pendente.
  await page.getByRole('link', { name: 'Ver detalhe e decidir' }).first().click();
  await page.waitForURL(new RegExp(`/app/credora/matching/${MATCHING_SUGERIDA_ID}$`), {
    timeout: 10_000,
  });
  await expect(page.getByRole('heading', { name: 'Detalhe do matching' })).toBeVisible();

  // Gesto explicito -> reconsulta -> dialogo -> confirmacao sem token navega ao step-up.
  await page.getByRole('button', { name: 'Confirmar matching' }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await expect(page.getByLabel('Motivo (opcional)')).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar decisao' }).click();
  await page.waitForURL(/\/app\/step-up\?next=/, { timeout: 10_000 });

  // Retorno sem completar o desafio: nada foi decidido e um novo gesto e exigido.
  await page.goBack();
  await page.waitForURL(new RegExp(`/app/credora/matching/${MATCHING_SUGERIDA_ID}$`), {
    timeout: 10_000,
  });
  await expect(page.getByText('Sugerida')).toBeVisible();
  await expect(page.getByText(/Matching confirmado e registrado/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Confirmar matching' })).toBeEnabled();
});

test('admin: matching confirmado tem CTA separado de aporte com prefill e step-up sem registro automatico', async ({
  page,
}) => {
  await login(page, 'admin@empresa.com');

  // Detalhe do matching ja confirmado: resultado terminal + CTA separado de aporte.
  await page.goto(`/app/credora/matching/${MATCHING_CONFIRMADA_ID}`);
  await expect(page.getByText(/Matching confirmado e registrado/)).toBeVisible();
  await page.getByRole('link', { name: 'Registrar aporte da operacao' }).click();
  await page.waitForURL(new RegExp(`/app/credora/matching/${MATCHING_CONFIRMADA_ID}/aporte$`), {
    timeout: 10_000,
  });

  // Prefill autoritativo com o valorElegivel do backend e status dos aportes existentes.
  await expect(page.getByLabel('Valor do aporte (R$)')).toHaveValue('18000.00');
  await expect(page.getByText('Em processamento')).toBeVisible();
  await expect(page.getByText('Falhou', { exact: true })).toBeVisible();

  // Confirmacao sem token navega ao step-up; retorno nao registra nada sozinho.
  await page.getByRole('button', { name: 'Registrar aporte' }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await expect(page.getByRole('alertdialog')).toContainText('nenhum dinheiro real');
  await page.getByRole('button', { name: 'Confirmar aporte' }).click();
  await page.waitForURL(/\/app\/step-up\?next=/, { timeout: 10_000 });

  await page.goBack();
  await page.waitForURL(new RegExp(`/app/credora/matching/${MATCHING_CONFIRMADA_ID}/aporte$`), {
    timeout: 10_000,
  });
  await expect(page.getByText(/Aporte registrado no valor de/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Registrar aporte' })).toBeEnabled();
});

test('credora: carteira mostra aportes somente leitura, sem mutacao', async ({ page }) => {
  await login(page, 'credora@empresa.com');

  // Navegacao SPA (sem page.goto): um full reload reinicia o estado do MSW no bundle e a sessao
  // mock voltaria ao usuario default, perdendo a persona credora.
  await page.getByRole('link', { name: 'Credora' }).click();
  await page.getByRole('link', { name: 'Carteira' }).click();
  await page.waitForURL(/\/app\/credora\/carteira$/, { timeout: 10_000 });
  await page.getByRole('link', { name: OPERACAO_CARTEIRA_ID.slice(-8) }).click();
  await page.waitForURL(new RegExp(`/app/credora/carteira/${OPERACAO_CARTEIRA_ID}$`), {
    timeout: 10_000,
  });

  await expect(page.getByRole('heading', { name: 'Aportes' })).toBeVisible();
  await expect(page.getByText(/10\.000,00/)).toBeVisible();
  await expect(page.getByText('Liquidado', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Atualizar status' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Registrar aporte' })).toHaveCount(0);
});

// A negacao da ROTA operacional para role indevida e coberta pelos testes unitarios do roleGuard
// e da configuracao de rotas (Vitest): provar via page.goto no modo offline e inviavel porque o
// full reload reinicia o estado do MSW e a sessao mock volta ao usuario default (ADMIN).
test('backoffice e credora (CLIENTE): nao veem o menu de matching', async ({ page }) => {
  await login(page, 'backoffice@empresa.com');
  await expect(page.getByRole('link', { name: 'Matching de credoras' })).toHaveCount(0);

  await login(page, 'credora@empresa.com');
  await expect(page.getByRole('link', { name: 'Matching de credoras' })).toHaveCount(0);
  // Persona CLIENTE mantem o menu proprio da jornada credora, separado do operacional.
  await expect(page.getByRole('link', { name: 'Credora' })).toBeVisible();
});
