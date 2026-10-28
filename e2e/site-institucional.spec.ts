import { expect, test, type Page } from '@playwright/test';

// Smoke do site institucional. As sete telas nasceram juntas e compartilham cabeçalho e rodapé:
// um erro no shell público quebraria todas de uma vez, e é isso que este arquivo pega cedo.

const PAGINAS = [
  { rota: '/credito-pj', titulo: /Capital de giro para empresas/ },
  { rota: '/seguranca', titulo: /Controles que existem no produto/ },
  { rota: '/como-funciona', titulo: /Do cadastro à quitação/ },
  { rota: '/sobre-o-sep', titulo: /Sociedade de Empréstimo entre Pessoas/ },
  { rota: '/contato', titulo: /Fale com a/ },
  { rota: '/termos-de-uso', titulo: /Termos de uso/ },
  { rota: '/politica-de-privacidade', titulo: /Política de privacidade/ },
];

async function semRolagemHorizontal(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

test('as sete telas abrem, com o mesmo shell e sem transbordo', async ({ page }) => {
  await page.setViewportSize({ width: 1449, height: 1086 });

  for (const item of PAGINAS) {
    await page.goto(item.rota);
    await expect(page.locator('.site-shell')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(item.titulo);
    expect(await semRolagemHorizontal(page)).toBe(0);
  }
});

test('o item aberto se mostra selecionado no menu', async ({ page }) => {
  await page.setViewportSize({ width: 1449, height: 1086 });
  await page.goto('/como-funciona');

  const ativo = page.locator('.site-nav-ativo');
  await expect(ativo).toHaveCount(1);
  await expect(ativo).toHaveText('Como funciona');
});

// Antes "Privacidade" e "Termos de uso" apontavam para `/` sem fragmento.
test('os links do rodapé levam aos documentos legais', async ({ page }) => {
  await page.setViewportSize({ width: 1449, height: 1086 });
  await page.goto('/');

  await page.locator('.footer-links a', { hasText: 'Termos de uso' }).click();
  await expect(page).toHaveURL(/\/termos-de-uso/);

  await page.locator('.site-footer-links a', { hasText: 'Política de privacidade' }).click();
  await expect(page).toHaveURL(/\/politica-de-privacidade/);
});

test('o menu da landing leva às telas, e não a âncoras', async ({ page }) => {
  await page.setViewportSize({ width: 1449, height: 1086 });
  await page.goto('/');

  await page.locator('.landing-nav a', { hasText: 'Crédito PJ' }).click();
  await expect(page).toHaveURL(/\/credito-pj/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Capital de giro');
});

test('o formulário de contato exige consentimento e monta o mailto', async ({ page }) => {
  await page.setViewportSize({ width: 1449, height: 1086 });
  await page.goto('/contato');

  await page.locator('#ct-nome').fill('Maria Souza');
  await page.locator('#ct-email').fill('maria@empresa.com');
  await page.locator('#ct-telefone').fill('81999998888');
  await expect(page.locator('#ct-telefone')).toHaveValue('(81) 99999-8888');
  await page.locator('#ct-mensagem').fill('Dúvida sobre a proposta do contrato 5b771c05.');

  await page.getByRole('button', { name: /Enviar mensagem/ }).click();
  await expect(page.getByText(/Sem a autorização não conseguimos responder/)).toBeVisible();

  await page.locator('#ct-consent').check();
  await page.getByRole('button', { name: /Enviar mensagem/ }).click();

  const abrir = page.getByRole('link', { name: /Abrir no meu e-mail/ });
  await expect(abrir).toBeVisible();
  await expect(abrir).toHaveAttribute('href', /^mailto:contato@dynamisbank\.com/);
});

test('o mapa da sede entra quando aparece na tela', async ({ page }) => {
  await page.setViewportSize({ width: 1449, height: 1086 });
  await page.goto('/contato');

  const mapa = page.locator('.px53-mapa iframe');
  await expect(mapa).toHaveAttribute('src', /output=embed/);
  await expect(page.getByRole('link', { name: /Abrir no Google Maps/ })).toBeVisible();
});
