import { expect, test, type Page } from '@playwright/test';

// Smoke da gestao de chaves Pix da conta operacional (F-20) em modo MSW/dev-offline (sem backend
// real). Cobre o que funciona offline: listagem mascarada com historico, cadastro e remocao
// navegando ao step-up SEM mutar no retorno, e bloqueio de menu para role indevida.
//
// Fora de alcance offline, por limitacao do ambiente e nao por escolha:
//  - cadastro/remocao concluidos com token TOTP real exigem o desafio MFA (sem handler offline);
//    ficam para o smoke local com backend :8080, como nas demais jornadas sensiveis;
//  - a lista vazia so existiria removendo as duas chaves do seed, o que depende justamente do
//    step-up acima. A superficie vazia e coberta no Vitest da pagina;
//  - a negacao da ROTA para role indevida nao e demonstravel aqui: um page.goto reinicia o estado
//    do MSW no bundle e a sessao mock volta ao usuario default (ADMIN). Fica coberta pelos testes
//    de roleGuard e da configuracao de rotas no Vitest (mesma limitacao registrada na F-18).
// Mascaras como o mock as produz (mascararChavePix mantem os 3 primeiros caracteres). O
// acoplamento e proposital: se o mascaramento afrouxar, estes smokes quebram.
const CHAVE_ATIVA_MASCARA = 'fin***';
const CHAVE_INATIVA_MASCARA = '112***';

// O retorno tem de apontar para ESTA rota — e o que garante que o operador volta a tela que exige
// novo clique. Asserir apenas "foi para o step-up" deixaria passar um next divergente.
const URL_STEP_UP_DE_VOLTA = '/app/step-up?next=%2Fapp%2Fpix%2Fchaves';

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

// Navegacao SPA (sem page.goto): um full reload reinicia o estado do MSW no bundle.
async function abrirChavesPix(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Chaves Pix' }).click();
  await page.waitForURL(/\/app\/pix\/chaves$/, { timeout: 10_000 });
}

// Personas: as duas veem a tela (o backend autoriza FINANCEIRO e ADMIN), mas no seed offline so o
// admin tem MFA ativo — e MFA e pre-condicao do step-up. Por isso a leitura roda como FINANCEIRO
// (persona operacional tipica) e as mutacoes rodam como ADMIN.
test('financeiro: lista chaves mascaradas com historico ATIVA e INATIVA', async ({ page }) => {
  await login(page, 'financeiro@empresa.com');
  await abrirChavesPix(page);

  await expect(
    page.getByRole('heading', { name: 'Chaves Pix da conta operacional' }),
  ).toBeVisible();
  await expect(page.getByRole('region', { name: 'Chaves cadastradas' })).toBeVisible();

  // Sempre mascarada: o valor integral nunca chega ao browser.
  await expect(page.getByText(CHAVE_ATIVA_MASCARA)).toBeVisible();
  await expect(page.getByText(CHAVE_INATIVA_MASCARA)).toBeVisible();
  await expect(page.getByText('financeiro@dynamis.com.br')).toHaveCount(0);

  // Badge textual, nao so cor; historico inativo permanece visivel.
  await expect(page.getByText('Ativa', { exact: true })).toBeVisible();
  await expect(page.getByText('Inativa', { exact: true })).toBeVisible();

  // Remover so na chave ATIVA (uma linha, nao duas).
  await expect(page.getByRole('button', { name: /^Remover chave/ })).toHaveCount(1);

  // Presenca do CTA de refresh. Que a lista so recarregue por gesto — e que nao haja polling — e
  // provado por contagem de GETs no Vitest da pagina; aqui isso NAO e verificavel.
  await expect(page.getByRole('button', { name: 'Atualizar' })).toBeEnabled();
});

// Sem MFA ativo nao ha step-up possivel: a tela orienta a habilitar em vez de abrir a confirmacao.
test('financeiro sem MFA: cadastro orienta a habilitar verificacao e nao abre a confirmacao', async ({
  page,
}) => {
  await login(page, 'financeiro@empresa.com');
  await abrirChavesPix(page);

  await page.getByLabel('Valor da chave').fill('chave-sem-mfa');
  await page.getByRole('button', { name: 'Cadastrar chave' }).click();

  await expect(page.getByText(/verificacao em duas etapas \(MFA\) ativa/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ativar verificacao em duas etapas' })).toBeVisible();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
});

test('admin: cadastro confirma e navega ao step-up sem cadastrar no retorno', async ({ page }) => {
  await login(page, 'admin@empresa.com');
  await abrirChavesPix(page);

  await page.getByLabel('Tipo da chave').selectOption('EVP');
  await page.getByLabel('Valor da chave').fill('chave-aleatoria-smoke');
  await page.getByRole('button', { name: 'Cadastrar chave' }).click();

  // Dialogo acessivel com o que sera enviado e o aviso de provider local.
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await expect(page.getByRole('alertdialog')).toContainText('provider local (fake)');

  await page.getByRole('button', { name: 'Confirmar cadastro' }).click();
  await page.waitForURL(`**${URL_STEP_UP_DE_VOLTA}`, { timeout: 10_000 });

  // Retorno sem completar o desafio: nada foi cadastrado e um novo gesto e exigido.
  await page.goBack();
  await page.waitForURL(/\/app\/pix\/chaves$/, { timeout: 10_000 });
  // Especifico da mensagem de sucesso: /cadastrada/i sozinho casaria com a coluna
  // "Cadastrada em" e com o heading "Chaves cadastradas".
  await expect(page.getByText(/Chave .+ cadastrada \(/)).toHaveCount(0);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Cadastrar chave' })).toBeEnabled();
  // O rascunho da intencao sobrevive a ida e volta, para o retry reusar a MESMA key.
  await expect(page.getByLabel('Valor da chave')).toHaveValue('chave-aleatoria-smoke');
});

test('admin: remocao confirma e navega ao step-up sem remover no retorno', async ({ page }) => {
  await login(page, 'admin@empresa.com');
  await abrirChavesPix(page);

  await page.getByRole('button', { name: /^Remover chave/ }).click();

  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('permanece no historico');

  await page.getByRole('button', { name: 'Confirmar remocao' }).click();
  await page.waitForURL(`**${URL_STEP_UP_DE_VOLTA}`, { timeout: 10_000 });

  // Retorno sem completar o desafio: a chave segue ATIVA e o CTA continua disponivel.
  await page.goBack();
  await page.waitForURL(/\/app\/pix\/chaves$/, { timeout: 10_000 });
  // Idem: /removida/i sozinho casaria com a coluna "Removida em".
  await expect(page.getByText(/Chave .+ removida \(/)).toHaveCount(0);
  await expect(page.getByText('Ativa', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Remover chave/ })).toHaveCount(1);
});

test('backoffice e cliente: nao veem o menu de chaves Pix', async ({ page }) => {
  // BACKOFFICE entra no Pix operacional, mas o backend restringe as chaves a FINANCEIRO/ADMIN.
  await login(page, 'backoffice@empresa.com');
  await expect(page.getByRole('link', { name: 'Pix' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Chaves Pix' })).toHaveCount(0);

  await login(page, 'credora@empresa.com');
  await expect(page.getByRole('link', { name: 'Chaves Pix' })).toHaveCount(0);
});
