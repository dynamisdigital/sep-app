// Captura as telas dos modulos novos para o pacote de documentacao de convergencia (dados ficticios).
//
// Pre-requisito: o sistema rodando em modo demonstracao (MSW), na porta 4200:
//   npm run start -- --port 4200
// Uso (na raiz do projeto sep-app): node docs/convergencia-mvp/capturar-telas.cjs

const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE = process.env.SEP_URL || 'http://localhost:4200';
const SENHA = '123456';
const saida = path.join(__dirname, 'imagens');
fs.mkdirSync(saida, { recursive: true });

async function contexto(browser) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  await ctx.addInitScript(() => {
    window.localStorage.setItem('NG_APP_USE_MSW', 'true');
    window.localStorage.setItem('SEP_TOUR_NARRACAO', 'false');
    window.localStorage.setItem('SEP_TOUR_MUSICA', 'false');
  });
  return ctx;
}

async function entrar(browser, email) {
  const ctx = await contexto(browser);
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
  await page.waitForTimeout(1200);
}

async function foto(page, pasta, arquivo) {
  const dir = path.join(saida, pasta);
  fs.mkdirSync(dir, { recursive: true });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(dir, arquivo), type: 'jpeg', quality: 86 });
  console.log('OK', pasta + '/' + arquivo);
}

async function tela(page, rota, pasta, arquivo) {
  try {
    await irPara(page, rota);
    await foto(page, pasta, arquivo);
  } catch (e) {
    console.log('FALHOU', rota, e.message.split('\n')[0]);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // Credora (conta escrow, oportunidades, alocacoes, saques)
  let s = await entrar(browser, 'credora@empresa.com');
  await tela(s.page, '/app/credora/conta', 'credores-escrow', '01-conta-escrow-credora.jpg');
  await tela(s.page, '/app/credora/oportunidades', 'credores-escrow', '02-oportunidades.jpg');
  await tela(s.page, '/app/credora/alocacoes', 'credores-escrow', '03-alocacoes.jpg');
  await tela(s.page, '/app/credora/saques', 'credores-escrow', '04-saques.jpg');
  await tela(s.page, '/app/credora/carteira', 'credores-escrow', '05-carteira.jpg');
  await s.ctx.close();

  // Administracao / tesouraria
  s = await entrar(browser, 'admin@empresa.com');
  await tela(s.page, '/app/backoffice/credores', 'credores-escrow', '06-gestao-de-credores.jpg');
  await tela(s.page, '/app/backoffice/tesouraria', 'credores-escrow', '07-tesouraria.jpg');
  await tela(s.page, '/app/glossario', 'glossario', '01-glossario.jpg');
  await s.ctx.close();

  // Site publico (sem login)
  const ctx = await contexto(browser);
  const page = await ctx.newPage();
  for (const [rota, arq] of [
    ['/', '01-landing.jpg'],
    ['/investidores', '02-investidores.jpg'],
    ['/blog', '03-blog.jpg'],
    ['/transparencia', '04-transparencia.jpg'],
    ['/perguntas-frequentes', '05-perguntas-frequentes.jpg'],
    ['/antifraude', '06-antifraude.jpg'],
    ['/demonstracao', '07-demonstracao.jpg'],
  ]) {
    try {
      await page.goto(`${BASE}${rota}`);
      await foto(page, 'site-publico', arq);
    } catch (e) {
      console.log('FALHOU', rota, e.message.split('\n')[0]);
    }
  }
  await ctx.close();

  await browser.close();
})();
