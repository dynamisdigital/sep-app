// Capturas da segunda parte do relatorio de 07/10/2026: rede de sub-correspondentes, Pix Automatico e
// analise de credito. Mesmo molde de capturar-telas.js.
//
// Pre-requisito: o sistema rodando em modo demonstracao (dados ficticios), na porta 4200:
//   npm run start -- --port 4200
// Uso (na raiz do projeto sep-app): node docs/atualizacao-07102026/capturar-telas-extra.js

const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE = process.env.SEP_URL || 'http://localhost:4200';
const SENHA = '123456';
const saida = path.join(__dirname, 'imagens');
fs.mkdirSync(saida, { recursive: true });

async function entrar(browser, email) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1250 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => window.localStorage.setItem('NG_APP_USE_MSW', 'true'));
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.locator('#login-username').fill(email);
  await page.locator('#login-password').fill(SENHA);
  await page.getByRole('button', { name: /entrar na plataforma/i }).click();
  await page.waitForURL(/\/app\//, { timeout: 20000 });
  return { ctx, page };
}

// Navega dentro do SPA: recarregar a pagina perderia a sessao e o estado dos dados ficticios.
async function irPara(page, rota) {
  await page.evaluate((r) => {
    window.history.pushState({}, '', r);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, rota);
  await page.waitForSelector('.cor-page, .proposals-page', { timeout: 20000 });
  await page.waitForFunction(() => !document.querySelector('.cor-page .cor-estado[role="status"]'), null, {
    timeout: 20000,
  });
  await page.waitForTimeout(500);
}

async function tela(page, arquivo) {
  await page.screenshot({ path: path.join(saida, arquivo), type: 'jpeg', quality: 86 });
  console.log('OK', arquivo);
}

async function trecho(page, seletor, arquivo) {
  const alvo = page.locator(seletor).first();
  await alvo.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await alvo.screenshot({ path: path.join(saida, arquivo), type: 'jpeg', quality: 86 });
  console.log('OK', arquivo);
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // Correspondente majoritario: a rede dele
  let s = await entrar(browser, 'correspondente@empresa.com');
  await irPara(s.page, '/app/meu-backoffice/rede');
  await tela(s.page, '20-minha-rede.jpg');
  await trecho(s.page, '[data-tour="cor-rede-subs"]', '21-rede-subs.jpg');
  await s.ctx.close();

  // Sub-correspondente: so a propria posicao
  s = await entrar(browser, 'sub-correspondente@empresa.com');
  await irPara(s.page, '/app/meu-backoffice/rede');
  await tela(s.page, '22-sub-posicao.jpg');
  await s.ctx.close();

  // Administracao: teto de repasse, hierarquia, Pix Automatico e analise
  s = await entrar(browser, 'admin@empresa.com');
  await irPara(s.page, '/app/correspondentes/comissoes');
  await trecho(s.page, '[data-tour="cor-regras"]', '23-teto-repasse-admin.jpg');
  await irPara(s.page, '/app/correspondentes');
  await trecho(s.page, '.cor-tabela', '24-hierarquia-rede.jpg');

  await irPara(s.page, '/app/credito/pix-automatico');
  await tela(s.page, '25-pix-automatico.jpg');
  await s.page.locator('tr', { hasText: '5b771c03' }).getByRole('button', { name: 'Cobranças' }).click();
  await s.page.waitForSelector('[data-tour="pix-auto-cobrancas"] tbody tr');
  await trecho(s.page, '[data-tour="pix-auto-cobrancas"]', '26-pix-cobrancas.jpg');

  const analisar = async (id, resultado, fatores) => {
    // Sai da tela antes: a mesma rota com outro id reaproveita o componente.
    await irPara(s.page, '/app/credito/propostas');
    await irPara(s.page, `/app/credito/propostas/3f0799c0-98b9-6d9d-bc4a-7d6f5b771${id}/analise`);
    await s.page.getByRole('checkbox').check();
    await s.page.getByRole('button', { name: 'Executar análise' }).click();
    await s.page.waitForSelector('[data-tour="analise-resultado"]');
    await s.page.waitForTimeout(500);
    await s.page.evaluate(() => window.scrollTo(0, 0));
    await tela(s.page, resultado);
    if (fatores) await trecho(s.page, '[data-tour="analise-fatores"]', fatores);
  };
  await analisar('c01', '27-analise-resultado.jpg', '28-analise-fatores.jpg');
  await analisar('c08', '29-analise-recusa.jpg', null);
  await s.ctx.close();

  await browser.close();
})().catch((e) => {
  console.error('FALHOU', e.message.split('\n')[0]);
  process.exit(1);
});
