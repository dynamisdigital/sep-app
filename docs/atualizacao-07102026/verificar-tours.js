// Executa os tours do modulo de Correspondentes no navegador, um a um, com a conta do papel que os
// usa, e informa se cada roteiro concluiu ou parou (e em que passo).
//
// Pre-requisito: sistema em modo demonstracao na porta 4200 (npm run start -- --port 4200).
// Uso (raiz do projeto): node docs/atualizacao-07102026/verificar-tours.js

const { chromium } = require('@playwright/test');

const BASE = process.env.SEP_URL || 'http://localhost:4200';

const CASOS = [
  {
    conta: 'correspondente@empresa.com',
    roteiros: [
      'Meu painel',
      'Funil de prospecção',
      'Agenda e relacionamento',
      'Contratos e parcelas dos clientes',
      'Minha base de clientes',
      'Enviar documentos com atesto',
      'Minhas comissões',
      'Meu desempenho',
      'Relatórios da carteira',
      'Módulo completo',
    ],
  },
  {
    conta: 'admin@empresa.com',
    roteiros: ['Rede de Correspondentes', 'Comissionamento da rede', 'Desempenho e metas da rede', 'Auditoria do módulo'],
  },
  { conta: 'backoffice@empresa.com', roteiros: ['Validar envios de correspondentes'] },
];

async function entrar(browser, email) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => window.localStorage.setItem('NG_APP_USE_MSW', 'true'));
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.locator('#login-username').fill(email);
  await page.locator('#login-password').fill('123456');
  await page.getByRole('button', { name: /entrar na plataforma/i }).click();
  await page.waitForURL(/\/app\//, { timeout: 20000 });
  return { ctx, page };
}

async function rodar(page, titulo) {
  await page.getByRole('button', { name: 'Ajuda' }).first().click();
  const grupo = page.locator('details.op-ajuda-grupo', { hasText: 'Correspondentes' }).first();
  await grupo.locator('summary').click();
  await grupo.locator('button.op-ajuda-roteiro', { hasText: titulo }).first().click();

  // Acelera ao maximo e espera o aviso final (verde = concluiu; ambar = parou).
  const velocidade = page.locator('button[aria-label^="Velocidade"]');
  await velocidade.waitFor({ timeout: 15000 });
  for (let i = 0; i < 2; i += 1) await velocidade.click();

  const aviso = page.locator('.sep-tour-aviso');
  await aviso.waitFor({ timeout: 1500000 });
  const tom = await aviso.getAttribute('data-tone');
  const texto = (await aviso.innerText()).trim();
  const passo = (await page.locator('h3').last().first().innerText().catch(() => '')) || '';
  await page.getByRole('button', { name: 'Fechar' }).click().catch(() => {});
  return { ok: tom === 'green', texto, passo };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  let falhas = 0;
  for (const caso of CASOS) {
    for (const titulo of caso.roteiros) {
      if (process.argv[2] && !titulo.includes(process.argv[2])) continue;
      const { ctx, page } = await entrar(browser, caso.conta);
      try {
        const r = await rodar(page, titulo);
        console.log(`${r.ok ? 'OK    ' : 'FALHOU'} [${caso.conta}] ${titulo}${r.ok ? '' : ` -> ${r.passo}: ${r.texto}`}`);
        if (!r.ok) falhas += 1;
      } catch (e) {
        falhas += 1;
        console.log(`ERRO   [${caso.conta}] ${titulo} -> ${String(e.message).split('\n')[0]}`);
        await page.screenshot({ path: `${__dirname}/erro-tour.png` }).catch(() => {});
      }
      await ctx.close();
    }
  }
  await browser.close();
  console.log(falhas ? `\n${falhas} roteiro(s) com problema` : '\nTodos os roteiros concluíram.');
  process.exit(falhas ? 1 : 0);
})();
