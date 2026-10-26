// Capturas reais, com dados fictícios, usadas como referência nas edições fotográficas.
// Uso: node scripts/demonstracao/capturar-telas-escuras.cjs (servidor na porta 4200).
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const saida = path.resolve('output/imagegen/dynamis-telas/referencias');
fs.mkdirSync(saida, { recursive: true });
const grupos = [
  [
    'backoffice@empresa.com',
    [
      ['backoffice', '/app/backoffice/dashboard', '.op-metrics'],
      ['cadastro', '/app/onboarding/empresa', '.kyb-stepper'],
      ['propostas', '/app/credito/propostas', '.proposal-metrics'],
      ['documentos', '/app/backoffice/correspondentes', '.cor-tabela'],
    ],
  ],
  [
    'correspondente@empresa.com',
    [
      ['rede-painel', '/app/meu-backoffice', '.cor-kpis'],
      ['rede-contratos', '/app/meu-backoffice/contratos', '[data-tour="cor-contratos-tabela"]'],
      ['rede-comissoes', '/app/meu-backoffice/comissoes', '[data-tour="cor-comissoes-kpis"]'],
      [
        'rede-comissoes-celular',
        '/app/meu-backoffice/comissoes',
        '[data-tour="cor-comissoes-kpis"]',
        true,
      ],
    ],
  ],
  [
    'credora@empresa.com',
    [
      ['financiador-cadastro', '/app/credora/perfil', '.px43-dados'],
      ['financiador-oportunidades', '/app/credora/oportunidades', '.px44-tabela-card'],
      ['financiador-carteira', '/app/credora/carteira', '.px46-tabela-card'],
    ],
  ],
];
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [email, capturas] of grupos) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        colorScheme: 'dark',
      });
      await context.addInitScript(() => {
        localStorage.setItem('NG_APP_USE_MSW', 'true');
        localStorage.setItem('SEP_THEME', 'dark');
      });
      const page = await context.newPage();
      await page.goto('http://localhost:4200/login');
      await page.locator('#login-username').fill(email);
      await page.locator('#login-password').fill('123456');
      await page.locator('.login-submit').click();
      await page.waitForURL(/\/app\//);
      for (const [nome, rota, alvo, mobile] of capturas) {
        await page.setViewportSize(
          mobile ? { width: 430, height: 900 } : { width: 1440, height: 900 },
        );
        await page.evaluate((url) => {
          window.history.pushState({}, '', url);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }, rota);
        await page.locator(alvo).first().waitFor({ state: 'visible' });
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(saida, `${nome}.png`) });
        console.log('OK', nome, rota);
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch((erro) => {
  console.error(erro);
  process.exitCode = 1;
});
