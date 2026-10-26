import { expect, test } from '@playwright/test';

const perfis = [
  'operacao_completa',
  'correspondente',
  'subcorrespondente',
  'cliente',
  'backoffice',
  'financiador',
];
const ativa = '.cena:not(.saindo)';

test('voltar à galeria restaura o par e a pausa anteriores', async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/demonstracao');
  await page.getByRole('button', { name: 'Pausar painel', exact: true }).click();
  for (const [posicao, perfil] of [
    ['8', 'Cliente'],
    ['10', 'Financiador'],
  ] as const) {
    await page.getByRole('button', { name: 'Próximas jornadas', exact: true }).click();
    await expect(page.locator('.jornadas-trilho')).toHaveCSS('--posicao', posicao);
    await page.getByRole('link', { name: `Ver banner de ${perfil}`, exact: true }).click();
    await expect(page.locator('.hero')).toBeVisible();
    await expect(page.locator('.painel-lateral, .painel-financiador')).toHaveCount(0);
    await page.getByRole('link', { name: 'Voltar à galeria', exact: true }).click();
    await expect(page.locator('.jornadas-trilho')).toHaveCSS('--posicao', posicao);
    await expect(page.getByRole('button', { name: 'Retomar painel', exact: true })).toBeVisible();
    await expect(page.locator('.hero-ponto.ativo')).toHaveCount(2);
  }
  await page.getByRole('link', { name: 'Ver banner de Backoffice', exact: true }).click();
  await expect(page.locator('.hero')).toBeVisible();
  await page.goBack();
  await expect(page.locator('.jornadas-trilho')).toHaveCSS('--posicao', '10');
});

test('imagens e setas abrem primeiro o banner, sem iniciar a apresentação', async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 1000 });
  for (const [label, perfil, seta] of [
    ['Operação completa', 'operacao_completa', false],
    ['Correspondente', 'correspondente', false],
    ['Correspondente', 'correspondente', true],
  ] as const) {
    await page.goto('/demonstracao');
    await page
      .getByRole('link', {
        name: `${seta ? 'Ver detalhes de ' : 'Ver banner de '}${label}`,
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(`/demonstracao/${perfil}`);
    await expect(page.locator('.hero')).toBeVisible();
    await expect(page.locator('.hero .botao')).toBeVisible();
    await expect(page.locator('.jornadas')).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: 'Tour assistido' })).toHaveCount(0);
  }
});

test('indicador inferior acompanha os pares e anima a passagem', async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 1000 });
  await page.goto('/demonstracao');
  const controles = page.locator('.hero-controles');
  await expect(controles.locator('.hero-ponto.ativo')).toHaveCount(2);
  await page.getByRole('link', { name: 'Início', exact: true }).focus();
  await page.mouse.move(0, 0);
  await expect(controles.locator('.hero-progresso')).toBeAttached();
  await expect(page.locator('.jornadas-trilho')).toHaveCSS('--posicao', '8', { timeout: 10000 });
  await expect(
    controles.getByRole('button', { name: 'Mostrar Subcorrespondente', exact: true }),
  ).toHaveClass(/ativo/);
  await expect(controles.getByRole('button', { name: 'Mostrar Cliente', exact: true })).toHaveClass(
    /ativo/,
  );
  await controles.getByRole('button', { name: 'Próxima experiência', exact: true }).click();
  await expect(page.locator('.jornadas-trilho')).toHaveCSS('--posicao', '10');
});

test('play retoma imediatamente com mouse e foco no botão e preserva o intervalo normal', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1500, height: 1000 });
  await page.goto('/demonstracao');
  const trilho = page.locator('.jornadas-trilho');
  await page.getByRole('button', { name: 'Pausar painel', exact: true }).click();
  await expect(trilho).not.toHaveClass(/movendo/);
  await page.getByRole('button', { name: 'Retomar painel', exact: true }).click();
  await expect(trilho).toHaveClass(/movendo/, { timeout: 1000 });
  await expect(trilho).not.toHaveClass(/parado/);
  await expect(trilho).toHaveCSS('--posicao', '8');
  await expect(trilho).not.toHaveClass(/movendo/);
  await page.waitForTimeout(3000);
  await expect(trilho).not.toHaveClass(/movendo/);
  await expect(trilho).toHaveClass(/movendo/, { timeout: 2000 });
  await page.getByRole('button', { name: 'Pausar painel', exact: true }).click();
  await expect(trilho).toHaveClass(/parado/);
  await page.waitForTimeout(100);
  const congelado = await trilho.evaluate((el) => getComputedStyle(el).transform);
  await page.waitForTimeout(300);
  expect(await trilho.evaluate((el) => getComputedStyle(el).transform)).toBe(congelado);
  await page.getByRole('button', { name: 'Retomar painel', exact: true }).click();
  await expect(trilho).not.toHaveClass(/parado/, { timeout: 1000 });
  await expect(trilho).toHaveCSS('--posicao', '10');
});

test('painel mantém navegação manual e pausa explícita', async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 1000 });
  await page.goto('/demonstracao');
  await expect(page.locator('.jornada-card')).toHaveCount(18);
  const trilho = page.locator('.jornadas-trilho');
  await page.getByRole('button', { name: 'Próximas jornadas', exact: true }).click();
  await expect(trilho).toHaveCSS('--posicao', '8');
  await page.keyboard.press('ArrowLeft');
  await expect(trilho).toHaveCSS('--posicao', '6');
  await page.getByRole('button', { name: 'Pausar painel', exact: true }).click();
  await page.getByRole('link', { name: 'Início', exact: true }).focus();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(4200);
  await expect(trilho).not.toHaveClass(/movendo/);
  await expect(trilho).toHaveCSS('--posicao', '6');
  await expect(page.locator('.cena:not(.saindo)')).toHaveAttribute(
    'data-perfil',
    'operacao_completa',
  );
});

test('arco real avança dois cartões por vez e repete o ciclo', async ({ page }) => {
  test.setTimeout(40_000);
  await page.setViewportSize({ width: 1500, height: 1000 });
  await page.goto('/demonstracao');
  await page.mouse.move(0, 0);
  const trilho = page.locator('.jornadas-trilho');
  await expect(trilho).toHaveCSS('--visiveis', '2');
  const centrais = page.locator('.jornada-card.central');
  await expect(centrais).toHaveCount(2);
  await expect(trilho).toHaveCSS('--posicao', '8', { timeout: 10_000 });
  await expect(trilho).toHaveCSS('--posicao', '10', { timeout: 10_000 });
  await expect(trilho).toHaveCSS('--posicao', '6', { timeout: 10_000 });
  await page.getByRole('button', { name: 'Pausar painel', exact: true }).click();
  await page.screenshot({ path: 'test-results/painel-arco-desktop.png', fullPage: true });
  const transformacoes = await page
    .locator('.jornada-card')
    .evaluateAll((cards) => cards.slice(5, 9).map((card) => getComputedStyle(card).transform));
  expect(transformacoes[1]).toBe(transformacoes[2]);
  expect(transformacoes[0]).not.toBe(transformacoes[1]);
  expect(transformacoes[3]).not.toBe(transformacoes[2]);
});

for (const [width, height] of [
  [1366, 768],
  [1920, 1080],
  [2560, 1080],
  [768, 900],
  [390, 844],
]) {
  test(`mockups e temas em ${width}x${height}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height });
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(e.message));
    for (const perfil of perfis) {
      await page.goto(`/demonstracao/${perfil}`);
      await expect(page.locator(ativa)).toHaveAttribute('data-perfil', perfil, { timeout: 15_000 });
      await expect(page.locator('.demonstracao h1')).toBeVisible();
      {
        await expect(page.locator('.jornada-card')).toHaveCount(0);
        await expect(page.locator('.etapas li')).toHaveCount(5);
        await expect(page.locator('.etapa-texto p')).toHaveCount(5);
        await expect(page.locator('.painel-financiador, .painel-lateral')).toHaveCount(0);
      }
      for (const tema of ['dark', 'light']) {
        await page.evaluate(
          (dark) => document.documentElement.classList.toggle('dark', dark),
          tema === 'dark',
        );
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        ).toBe(true);
        if (width >= 1080) {
          expect(
            await page.locator('.sep-viewport').evaluate((el) => Number(getComputedStyle(el).zoom)),
          ).toBe(1);
          const medidas = await page.evaluate(() => {
            const elementos = [
              ...document.querySelectorAll(
                '.demonstracao, .cena, .hero, .painel-lateral, .painel-financiador, .etapas, .etapas li, .jornada-card, .site-content',
              ),
            ];
            return {
              documento: document.documentElement.scrollHeight,
              janela: innerHeight,
              excesso: elementos
                .filter((el) => el.scrollHeight > el.clientHeight + 3)
                .map((el) => `${el.className}: ${el.scrollHeight}/${el.clientHeight}`),
              fora: elementos
                .filter((el) => el.getBoundingClientRect().bottom > innerHeight + 2)
                .map((el) => el.className),
            };
          });
          expect(medidas.excesso, `${perfil}/${tema}`).toEqual([]);
        }
        if ([1366, 1920, 390].includes(width))
          await page.screenshot({
            path: `test-results/visual-${perfil}-${width}-${tema}.png`,
            fullPage: true,
            animations: 'disabled',
          });
      }
      for (const foto of await page.locator('.demonstracao img').all()) {
        if (width < 1080) await foto.scrollIntoViewIfNeeded();
        await expect
          .poll(() => foto.evaluate((img) => (img as HTMLImageElement).naturalWidth))
          .toBeGreaterThan(0);
      }
      expect(await page.locator('sep-public-shell').innerText()).not.toMatch(
        /investidor|investimento/i,
      );
    }
    expect(erros).toEqual([]);
  });
}

test('movimento reduzido e aba invisível suspendem a rotação', async ({ page }) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/demonstracao');
  await expect(page.locator(ativa)).toBeVisible();
  await page.clock.runFor(30_000);
  await expect(page.locator(ativa)).toHaveAttribute('data-perfil', 'operacao_completa');
  await page.getByRole('button', { name: 'Mostrar Cliente', exact: true }).click();
  await expect(page.locator(ativa)).toHaveAttribute('data-perfil', 'cliente');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.mouse.move(0, 0);
  await page.getByRole('link', { name: 'Início', exact: true }).focus();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(30_000);
  await expect(page.locator(ativa)).toHaveAttribute('data-perfil', 'cliente');
});

test('escala original preserva a moldura de destaque do tour', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.addInitScript(() => {
    localStorage.setItem('NG_APP_USE_MSW', 'true');
    localStorage.setItem('SEP_TOUR_NARRACAO', 'false');
    localStorage.setItem('SEP_TOUR_MUSICA', 'false');
  });
  await page.goto('/demonstracao/correspondente');
  await page
    .getByRole('button', { name: 'Assistir cenário do correspondente', exact: true })
    .click();
  await expect(page.getByRole('dialog', { name: 'Tour assistido' })).toBeVisible();
  await page.waitForFunction(() => {
    const alvo = document.querySelector('.sep-tour-alvo');
    const foco = document.querySelector('.sep-tour-foco');
    if (!alvo || !foco) return false;
    const a = alvo.getBoundingClientRect();
    const f = foco.getBoundingClientRect();
    return (
      Math.abs(f.top - a.top + 6) < 2 &&
      Math.abs(f.left - a.left + 6) < 2 &&
      Math.abs(f.width - a.width - 12) < 2
    );
  });
});

test('meia tela limita os widgets em janela maximizada e preserva a preferência', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 2560, height: 1080 });
  await page.addInitScript(() => {
    if (!localStorage.getItem('SEP_LARGURA_CONTEUDO'))
      localStorage.setItem('SEP_LARGURA_CONTEUDO', 'expandida');
  });
  await page.goto('/demonstracao');
  const quadro = page.locator('.site-page');
  await expect(quadro).toHaveAttribute('data-largura', 'expandida', { timeout: 15_000 });
  await expect(page.locator('.site-topbar')).toHaveCount(0);
  const entrar = (await page.locator('.site-login').boundingBox())!;
  const financiador = page.getByRole('link', { name: 'Área do Financiador', exact: true });
  await expect(financiador).toHaveAttribute('href', '/login');
  const caixaFinanciador = (await financiador.boundingBox())!;
  expect(caixaFinanciador.y).toBeGreaterThanOrEqual(entrar.y + entrar.height);
  expect(
    Math.abs(caixaFinanciador.x + caixaFinanciador.width - entrar.x - entrar.width),
  ).toBeLessThan(2);
  const larguraExpandida = (await quadro.boundingBox())!.width;
  await page
    .getByRole('button', { name: 'Voltar a tela ao tamanho de meia tela', exact: true })
    .click();
  await expect(quadro).toHaveAttribute('data-largura', 'ajustada');
  const caixa = (await quadro.boundingBox())!;
  expect(caixa.width).toBeLessThan(larguraExpandida * 0.75);
  expect(Math.abs(caixa.x - (2560 - caixa.width) / 2)).toBeLessThan(2);
  await page.reload();
  await expect(quadro).toHaveAttribute('data-largura', 'ajustada', { timeout: 15_000 });
  expect((await quadro.boundingBox())!.width).toBeCloseTo(caixa.width, 0);
  for (const perfil of perfis) {
    await page.goto(`/demonstracao/${perfil}`);
    await expect(page.locator(ativa)).toHaveAttribute('data-perfil', perfil, { timeout: 15_000 });
    await expect(quadro).toHaveAttribute('data-largura', 'ajustada');
    const excesso = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          '.cena, .hero, .painel-lateral, .painel-financiador, .etapas li, .jornada-card',
        ),
      ]
        .filter((el) => el.scrollHeight > el.clientHeight + 3)
        .map((el) => `${el.className}: ${el.scrollHeight}/${el.clientHeight}`),
    );
    expect(excesso, perfil).toEqual([]);
  }
  await page
    .getByRole('button', { name: 'Expandir a tela para toda a largura', exact: true })
    .click();
  await expect(quadro).toHaveAttribute('data-largura', 'expandida');
  expect((await quadro.boundingBox())!.width).toBeCloseTo(larguraExpandida, 0);
  await page.reload();
  await expect(quadro).toHaveAttribute('data-largura', 'expandida', { timeout: 15_000 });
});
