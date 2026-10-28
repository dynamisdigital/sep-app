import { expect, test, type Page } from '@playwright/test';

// Central de notificacoes (F-27) em modo MSW/dev-offline, contra os handlers REAIS de
// src/mocks/handlers.ts — nenhum handler e substituido aqui. O que esta prova protege: o mock filtra
// dono e canal IN_APP antes de paginar e contar, como o backend. Um mock sem esse recorte deixaria a
// tela certa mostrando aviso de outra conta, e nenhum teste de componente veria.
//
// Estado do mock: vive no bundle da pagina. Cada teste abre contexto novo (reset deterministico); DENTRO
// do teste so ha navegacao SPA, porque um page.goto reiniciaria o seed e apagaria a leitura feita.
//
// As chamadas diretas de `chamarApi` rodam no browser, pelo mesmo service worker do MSW que a tela
// usa: servem para o que a tela nunca faz (id de outra conta, requisicao sem token, paginacao
// invalida), e nao para contornar a UI no que ela faz.

const API = 'http://localhost:8080/api/v1';
// Seed de src/mocks/handlers.ts: e-mail de conta bloqueada do tomador (canal EMAIL).
const EMAIL_DO_TOMADOR_ID = '9f0799c0-98b9-6d9d-bc4a-7d6f5b79b001';
const ID_INEXISTENTE = '9f0799c0-98b9-6d9d-bc4a-7d6f5b79ffff';

interface RespostaApi {
  status: number;
  corpo: Record<string, unknown> | null;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('NG_APP_USE_MSW', 'true'));
});

async function abrirLogin(page: Page): Promise<void> {
  await page.goto('/login');
}

// Assume a tela de login aberta; nao recarrega a pagina.
async function entrarComo(page: Page, username: string): Promise<void> {
  await page.getByLabel(/e-mail/i).fill(username);
  await page.getByLabel(/^senha$/i).fill('123456');
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL(/\/app\/dashboard/, { timeout: 10_000 });
}

async function sair(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Sair' }).click();
  await page.waitForURL(/\/login/, { timeout: 10_000 });
}

async function abrirCentral(page: Page): Promise<void> {
  await page.getByRole('link', { name: /^Notificacoes,/ }).click();
  await page.waitForURL(/\/app\/notificacoes$/, { timeout: 10_000 });
}

function larguraDoDocumento(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth);
}

function avisos(page: Page) {
  return page.getByRole('list', { name: 'Notificacoes' }).getByRole('listitem');
}

async function chamarApi(
  page: Page,
  metodo: 'GET' | 'POST',
  caminho: string,
  comToken = true,
): Promise<RespostaApi> {
  return page.evaluate(
    async ({ url, metodo, comToken }) => {
      const token = window.localStorage.getItem('SEP_ACCESS_TOKEN');
      const headers: Record<string, string> = {};
      if (comToken && token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const resposta = await fetch(url, { method: metodo, headers });
      const texto = await resposta.text();
      return { status: resposta.status, corpo: texto ? JSON.parse(texto) : null };
    },
    { url: `${API}${caminho}`, metodo, comToken },
  );
}

test('tomador: lista, pagina, conta e marca como lida pela central', async ({ page }) => {
  await abrirLogin(page);
  await entrarComo(page, 'tomador@empresa.com');
  await expect(page.getByRole('link', { name: 'Notificacoes, 3 nao lidas' })).toBeVisible();

  await abrirCentral(page);
  await expect(avisos(page)).toHaveCount(10);
  await expect(page.getByText('12 notificacoes')).toBeVisible();
  const paginacao = page.getByRole('navigation', { name: 'Paginacao das notificacoes' });
  await expect(paginacao).toContainText('Pagina 1 de 2');

  await paginacao.getByRole('button', { name: 'Proxima pagina' }).click();
  await expect(avisos(page)).toHaveCount(2);
  await expect(paginacao).toContainText('Pagina 2 de 2');
  await paginacao.getByRole('button', { name: 'Pagina anterior' }).click();
  await expect(avisos(page)).toHaveCount(10);

  await avisos(page).first().getByRole('button', { name: 'Marcar como lida' }).click();
  await expect(avisos(page).first()).toContainText('Lida em');
  await expect(page.getByRole('link', { name: 'Notificacoes, 2 nao lidas' })).toBeVisible();
});

test('owner-scope: outra conta nao ve nem marca aviso do tomador, e a leitura dele fica', async ({
  page,
}) => {
  await abrirLogin(page);
  await entrarComo(page, 'tomador@empresa.com');
  const doTomador = await chamarApi(page, 'GET', '/notificacoes?page=0&size=1');
  const idDoTomador = (doTomador.corpo?.['content'] as { id: string }[])[0].id;
  await abrirCentral(page);
  await avisos(page).first().getByRole('button', { name: 'Marcar como lida' }).click();
  await expect(page.getByRole('link', { name: 'Notificacoes, 2 nao lidas' })).toBeVisible();

  await sair(page);
  await entrarComo(page, 'credora@empresa.com');
  await expect(page.getByRole('link', { name: 'Notificacoes, nenhuma nao lida' })).toBeVisible();
  await abrirCentral(page);
  await expect(page.getByText('Voce nao tem notificacoes.')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Notificacoes' })).toHaveCount(0);

  const leituraAlheia = await chamarApi(page, 'POST', `/notificacoes/${idDoTomador}/leitura`);
  // Neutro: aviso de outra conta responde igual a aviso inexistente, fora o `path`, que so repete a
  // URL da propria requisicao (como o ErrorResponseDto do backend).
  const inexistente = await chamarApi(page, 'POST', `/notificacoes/${ID_INEXISTENTE}/leitura`);
  expect(leituraAlheia.status).toBe(404);
  expect(inexistente.status).toBe(404);
  expect({ ...leituraAlheia.corpo, path: null }).toEqual({ ...inexistente.corpo, path: null });
  expect(leituraAlheia.corpo?.['codigo']).toBe('NTF-404-001');

  await sair(page);
  await entrarComo(page, 'tomador@empresa.com');
  await expect(page.getByRole('link', { name: 'Notificacoes, 2 nao lidas' })).toBeVisible();
});

test('mock fiel ao contrato: 401, 400 com codigo, e-mail fora, recorte inteiro e leitura idempotente', async ({
  page,
}) => {
  await abrirLogin(page);
  await entrarComo(page, 'tomador@empresa.com');

  const semToken = await chamarApi(page, 'GET', '/notificacoes/nao-lidas/contagem', false);
  expect(semToken.status).toBe(401);

  const tamanhoInvalido = await chamarApi(page, 'GET', '/notificacoes?page=0&size=101');
  expect(tamanhoInvalido.status).toBe(400);
  expect(tamanhoInvalido.corpo?.['codigo']).toBe('NTF-400-001');
  const paginaNegativa = await chamarApi(page, 'GET', '/notificacoes?page=-1&size=10');
  expect(paginaNegativa.corpo?.['codigo']).toBe('NTF-400-001');

  // O e-mail do proprio tomador existe no seed, mas fica fora da central: mesmo 404 neutro.
  const email = await chamarApi(page, 'POST', `/notificacoes/${EMAIL_DO_TOMADOR_ID}/leitura`);
  expect(email.status).toBe(404);
  expect(email.corpo?.['codigo']).toBe('NTF-404-001');

  // Total e contagem sao do recorte inteiro (dono + IN_APP), nao da pagina.
  const alemDoFim = await chamarApi(page, 'GET', '/notificacoes?page=5&size=10');
  expect(alemDoFim.corpo?.['content']).toEqual([]);
  expect(alemDoFim.corpo?.['totalElements']).toBe(12);
  const contagem = await chamarApi(page, 'GET', '/notificacoes/nao-lidas/contagem');
  expect(contagem.corpo).toEqual({ naoLidas: 3 });

  // DTO publico: sem dono, canal nem situacao de entrega.
  const primeiraPagina = await chamarApi(page, 'GET', '/notificacoes?page=0&size=1');
  const aviso = (primeiraPagina.corpo?.['content'] as Record<string, unknown>[])[0];
  expect(Object.keys(aviso).sort()).toEqual(
    ['criadaEm', 'id', 'lidaEm', 'mensagem', 'referencia', 'tipo', 'titulo'].sort(),
  );

  const primeira = await chamarApi(page, 'POST', `/notificacoes/${aviso['id']}/leitura`);
  const segunda = await chamarApi(page, 'POST', `/notificacoes/${aviso['id']}/leitura`);
  expect(primeira.status).toBe(200);
  expect(segunda.status).toBe(200);
  expect(segunda.corpo?.['lidaEm']).toBe(primeira.corpo?.['lidaEm']);
  const depois = await chamarApi(page, 'GET', '/notificacoes/nao-lidas/contagem');
  expect(depois.corpo).toEqual({ naoLidas: 2 });
});

// Acessibilidade no browser real: foco e teclado sao o que o happy-dom nao reproduz (ele nao move foco
// no click nem tira foco de botao desabilitado).
test('teclado: do sino a leitura e a paginacao, com foco e anuncios', async ({ page }) => {
  await abrirLogin(page);
  await entrarComo(page, 'tomador@empresa.com');

  await page.getByRole('button', { name: 'Alternar menu lateral' }).focus();
  await page.keyboard.press('Tab');
  const sino = page.getByRole('link', { name: 'Notificacoes, 3 nao lidas' });
  await expect(sino).toBeFocused();
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/app\/notificacoes$/, { timeout: 10_000 });
  await expect(page.getByRole('heading', { level: 1, name: 'Notificacoes' })).toBeFocused();
  await expect(sino).toHaveAttribute('aria-current', 'page');

  const anuncio = page.locator('.sep-notificacoes-anuncio');
  // O titulo recebe foco ja no carregando; o Tab so encontra o botao depois que a lista chega.
  await expect(avisos(page)).toHaveCount(10);
  await page.keyboard.press('Tab');
  const marcar = avisos(page).first().getByRole('button', { name: 'Marcar como lida' });
  await expect(marcar).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(avisos(page).first()).toContainText('Lida em');
  await expect(avisos(page).first().getByRole('heading', { level: 2 })).toBeFocused();
  await expect(anuncio).toHaveText('Aviso marcado como lido.');
  await expect(page.getByRole('link', { name: 'Notificacoes, 2 nao lidas' })).toBeVisible();

  await page.getByRole('button', { name: 'Proxima pagina' }).focus();
  await page.keyboard.press('Enter');
  await expect(avisos(page)).toHaveCount(2);
  await expect(page.getByRole('heading', { level: 1, name: 'Notificacoes' })).toBeFocused();
  await expect(anuncio).toHaveText('Pagina 2 de 2');
});

// page.goto reinicia o MSW: a sessao mock volta ao usuario default (ADMIN), que nao tem avisos. E o
// que torna este cenario tambem a prova do vazio pela URL direta.
test('URL direta abre a central com foco no titulo', async ({ page }) => {
  await abrirLogin(page);
  await entrarComo(page, 'tomador@empresa.com');

  await page.goto('/app/notificacoes');

  await expect(page.getByRole('heading', { level: 1, name: 'Notificacoes' })).toBeFocused();
  await expect(page.getByText('Voce nao tem notificacoes.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Notificacoes, nenhuma nao lida' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('viewport estreito: sino e leitura operaveis com alvo de toque suficiente', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await abrirLogin(page);
  await entrarComo(page, 'tomador@empresa.com');
  // DEFEITO PREEXISTENTE, fora da F-27 (medido em 2026-09-14): a 390px o login rola a pagina para
  // alcancar o formulario, a navegacao SPA mantem scrollY=160 no dashboard e o header, apesar de
  // `position: sticky`, fica em top=-160 — some inteiro, nao so o sino. Sem esta linha o teste mediria
  // aquele defeito e nao o acesso a central. Follow-up registrado no fechamento da sprint.
  await page.evaluate(() => window.scrollTo(0, 0));

  // Review de fim de sprint (P2): o sino somava 58px a um header que ja transbordava (455 -> 513px).
  // Ver o sino nao basta; a pagina nao pode rolar na horizontal.
  expect(await larguraDoDocumento(page)).toBeLessThanOrEqual(390);
  const sino = page.getByRole('link', { name: 'Notificacoes, 3 nao lidas' });
  await expect(sino).toBeInViewport();
  const caixaDoSino = await sino.boundingBox();
  expect(caixaDoSino?.width).toBeGreaterThanOrEqual(24);
  expect(caixaDoSino?.height).toBeGreaterThanOrEqual(24);

  await sino.click();
  await page.waitForURL(/\/app\/notificacoes$/, { timeout: 10_000 });
  const marcar = avisos(page).first().getByRole('button', { name: 'Marcar como lida' });
  await expect(marcar).toBeVisible();
  expect(await larguraDoDocumento(page)).toBeLessThanOrEqual(390);
  await marcar.scrollIntoViewIfNeeded();
  const caixaDoBotao = await marcar.boundingBox();
  expect(caixaDoBotao?.height).toBeGreaterThanOrEqual(24);
  await marcar.click();
  await expect(avisos(page).first()).toContainText('Lida em');
  await expect(page.getByRole('link', { name: 'Notificacoes, 2 nao lidas' })).toBeVisible();
});
