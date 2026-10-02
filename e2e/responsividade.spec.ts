import { expect, test, type Page } from '@playwright/test';

// Contrato responsivo full/half/third. O componente reage ao espaço que recebeu, e não à largura
// da janela: por isso a validação estreita o **container** e mantém o viewport fixo, e depois
// repete em viewports diferentes para provar que os dois eixos são independentes.

const TEMA = process.env.SEP_TEMA ?? 'dark';

test.beforeEach(async ({ page }) => {
  await page.addInitScript((t) => {
    window.localStorage.setItem('NG_APP_USE_MSW', 'true');
    window.localStorage.setItem('SEP_THEME', t);
  }, TEMA);
});

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/e-mail/i).fill('admin@empresa.com');
  await page.getByLabel(/^senha$/i).fill('123456');
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL(/\/app\/dashboard/, { timeout: 15_000 });
}

/** Estreita a área de conteúdo e mede a página, devolvendo a largura ao final. */
async function noModo(page: Page, largura: string, seletor: string) {
  return page.evaluate(
    ({ larg, sel }) => {
      const cont = document.querySelector('.op-content') as HTMLElement;
      cont.style.width = larg;
      void cont.offsetWidth;
      const alvo = document.querySelector(sel) as HTMLElement;
      const cs = getComputedStyle(alvo);
      const r = {
        largura: Math.round(alvo.getBoundingClientRect().width),
        colunas: cs.gridTemplateColumns.split(' ').filter(Boolean).length,
        transbordo: [...document.querySelectorAll(`${sel} *`)].filter(
          (e) => e.scrollWidth > e.clientWidth + 2,
        ).length,
      };
      cont.style.width = '';
      return r;
    },
    { larg: largura, sel: seletor },
  );
}

test('a página colapsa pelo espaço recebido, não pela janela', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await login(page);
  await page.goto('/app/credora/cadastro');
  await page.waitForSelector('.px36-page');

  const full = await noModo(page, '100%', '.px36-page');
  const half = await noModo(page, '50%', '.px36-page');
  const third = await noModo(page, '33%', '.px36-page');

  // Tela inteira preserva as duas colunas homologadas.
  expect(full.colunas).toBe(2);
  // Metade e um terço recolhem para coluna única — mesmo com a janela em 1920.
  expect(half.colunas).toBe(1);
  expect(third.colunas).toBe(1);
  expect(full.largura).toBeGreaterThan(half.largura);
});

test('o mesmo modo vale em viewports diferentes', async ({ page }) => {
  test.setTimeout(120_000);
  for (const [w, h] of [
    [1920, 1080],
    [1366, 768],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    await login(page);
    await page.goto('/app/credora/cadastro');
    await page.waitForSelector('.px36-page');

    // Largura **em pixels**, e nao em porcentagem: o que se quer provar e que o mesmo espaco
    // produz o mesmo resultado, seja qual for a janela. Com porcentagem, "100%" vale 1650px numa
    // janela e 1090px na outra — dois espacos diferentes, e o teste testaria outra coisa.
    expect((await noModo(page, '1200px', '.px36-page')).colunas).toBe(2);
    expect((await noModo(page, '700px', '.px36-page')).colunas).toBe(1);
  }
});

// A grade de cartões equivalentes não tem limiar nenhum: a geometria resolve.
test('a grade fluida se reorganiza sem limiar', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await login(page);
  await page.goto('/app/credora/cadastro');
  await page.waitForSelector('.px36-page');

  const colunas = await page.evaluate(() => {
    const cont = document.querySelector('.op-content') as HTMLElement;
    const medidas: number[] = [];
    for (const larg of ['100%', '60%', '30%']) {
      cont.style.width = larg;
      void cont.offsetWidth;
      const el = document.querySelector('.px36-linha-dupla') as HTMLElement | null;
      medidas.push(
        el ? getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length : -1,
      );
    }
    cont.style.width = '';
    return medidas;
  });
  // Nunca aumenta ao estreitar.
  expect(colunas[0]).toBeGreaterThanOrEqual(colunas[1]);
  expect(colunas[1]).toBeGreaterThanOrEqual(colunas[2]);
});
