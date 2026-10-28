// Captura as telas reais do modulo de Correspondentes para o relatorio de 07/10/2026.
//
// Pre-requisito: o sistema rodando em modo demonstracao (dados ficticios), na porta 4200:
//   npm run start -- --port 4200
// Uso (na raiz do projeto sep-app): node docs/atualizacao-07102026/capturar-telas.js

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
}

async function foto(page, rota, arquivo, depois) {
  await irPara(page, rota);
  await page.waitForSelector('.cor-page', { timeout: 20000 });
  await page.waitForFunction(() => !document.querySelector('.cor-page .cor-estado[role="status"]'), null, {
    timeout: 20000,
  });
  if (depois) await depois(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(saida, arquivo), type: 'jpeg', quality: 86 });
  console.log('OK', arquivo);
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // Correspondente com cadastro ativo
  let s = await entrar(browser, 'correspondente@empresa.com');
  await foto(s.page, '/app/meu-backoffice', '01-meu-backoffice-painel.jpg');
  await foto(s.page, '/app/meu-backoffice/base', '02-minha-base.jpg');
  await foto(s.page, '/app/meu-backoffice/contratos', '09-contratos.jpg');
  await s.page.locator('tr', { hasText: 'Ana Beatriz Costa' }).getByRole('link', { name: 'Parcelas' }).click();
  await s.page.waitForSelector('[data-tour="cor-parcelas"] tbody tr');
  await s.page.waitForTimeout(600);
  await s.page.screenshot({ path: path.join(saida, '10-detalhe-contrato.jpg'), type: 'jpeg', quality: 86 });
  console.log('OK 10-detalhe-contrato.jpg');
  await foto(s.page, '/app/meu-backoffice/prospeccao', '12-funil-prospeccao.jpg');
  await foto(s.page, '/app/meu-backoffice/agenda', '13-agenda.jpg');
  await foto(s.page, '/app/meu-backoffice/comissoes', '14-comissoes.jpg');
  await foto(s.page, '/app/meu-backoffice/desempenho', '15-desempenho.jpg');
  await foto(s.page, '/app/meu-backoffice/relatorios', '16-relatorios.jpg');
  await foto(s.page, '/app/meu-backoffice/documentos', '03-envio-documentos.jpg', async (p) => {
    await p.locator('select[name="cliente"]').selectOption({ label: 'João da Silva' });
    await p.locator('input[type="file"]').setInputFiles({
      name: 'rg-joao-da-silva.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 demonstracao'),
    });
    await p.locator('input[name="atesto"]').check();
    await p.getByRole('button', { name: /enviar documentos/i }).click();
    await p.waitForSelector('.cor-aviso[role="status"]');
  });
  await foto(s.page, '/app/meu-backoffice/contratos', '11-tour-contratos.jpg', async (p) => {
    await p.getByRole('button', { name: 'Ajuda' }).first().click();
    const grupo = p.locator('details.op-ajuda-grupo', { hasText: 'Correspondentes' }).first();
    await grupo.locator('summary').click();
    await grupo.locator('button.op-ajuda-roteiro', { hasText: 'Contratos e parcelas' }).first().click();
    await p.locator('h3', { hasText: 'Tabela de operações' }).first().waitFor({ timeout: 120000 });
  });
  await s.ctx.close();

  // Correspondente com cadastro vencido
  s = await entrar(browser, 'correspondente-vencido@empresa.com');
  await foto(s.page, '/app/meu-backoffice', '04-cadastro-vencido.jpg');
  await s.ctx.close();

  // Administracao: rede, apuracao e detalhe
  s = await entrar(browser, 'admin@empresa.com');
  await foto(s.page, '/app/correspondentes', '05-rede-correspondentes.jpg');
  // O estado do mock vive na pagina: a apuracao e o detalhe precisam acontecer na mesma sessao,
  // navegando pelo menu da propria tela, sem recarregar.
  await foto(s.page, '/app/correspondentes', '06-apuracao-vigencia.jpg', async (p) => {
    await p.getByRole('button', { name: /apurar vigências/i }).click();
    await p.waitForSelector('.cor-aviso[role="status"]');
  });
  await s.page.locator('tr', { hasText: 'Marcos Lima' }).getByRole('link', { name: 'Abrir' }).click();
  await s.page.waitForSelector('.cor-tabela td');
  await s.page.waitForTimeout(500);
  await s.page.screenshot({ path: path.join(saida, '07-detalhe-vinculos.jpg'), type: 'jpeg', quality: 86 });
  console.log('OK 07-detalhe-vinculos.jpg');
  await foto(s.page, '/app/correspondentes/comissoes', '17-comissoes-admin.jpg');
  await foto(s.page, '/app/correspondentes/desempenho', '18-desempenho-admin.jpg');
  await foto(s.page, '/app/correspondentes/auditoria', '19-auditoria.jpg');
  await s.ctx.close();

  // Backoffice: validacao dos envios
  s = await entrar(browser, 'backoffice@empresa.com');
  await foto(s.page, '/app/backoffice/correspondentes', '08-backoffice-envios.jpg');
  await s.ctx.close();

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
