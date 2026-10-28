import { expect, test } from '@playwright/test';
import { POSTS_DEMONSTRACAO } from '../src/app/features/public/shared/site-blog-demonstracao';

test('ajuda apresenta o módulo e o novo tour percorre todos os cenários com animação', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1706, height: 1258 });
  await page.addInitScript(() => {
    localStorage.setItem('SEP_TOUR_NARRACAO', 'false');
    localStorage.setItem('SEP_TOUR_MUSICA', 'false');
  });
  const erros: string[] = [];
  page.on('pageerror', (erro) => erros.push(erro.message));
  // A ajuda também precisa funcionar partindo de uma prévia, com a galeria pausada no último par.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/demonstracao');
  await page.getByRole('button', { name: 'Pausar painel', exact: true }).click();
  await page.getByRole('button', { name: 'Próximas jornadas', exact: true }).click();
  await page.getByRole('button', { name: 'Próximas jornadas', exact: true }).click();
  await page.getByRole('link', { name: 'Ver banner de Financiador', exact: true }).click();
  await expect(page.locator('.hero')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: 'Ajuda e tours do site', exact: true }).click();
  await page
    .locator('.ap-roteiro')
    .filter({ hasText: 'Cenários e controles da demonstração' })
    .click();
  await expect(page.getByRole('dialog', { name: 'Tour assistido' })).toBeVisible();
  await page.locator('button[aria-label^="Velocidade"]').click();
  await page.locator('button[aria-label^="Velocidade"]').click();
  await page.locator('button[aria-label^="Velocidade"]').click();
  const visitados = new Set<string>();
  let animou = false;
  const limite = Date.now() + 210_000;
  const aviso = page.locator('.sep-tour-aviso');
  while (Date.now() < limite) {
    visitados.add(new URL(page.url()).pathname);
    if (await page.locator('.jornadas-trilho.movendo:not(.parado)').count()) animou = true;
    if (await aviso.count()) break;
    const proximo = page.getByRole('button', { name: 'Próximo', exact: true });
    if (await proximo.isVisible()) await proximo.click();
    await page.waitForTimeout(350);
  }
  await expect(aviso).toHaveAttribute('data-tone', 'green');
  expect(animou).toBe(true);
  for (const artigo of POSTS_DEMONSTRACAO)
    expect(visitados.has(`/demonstracao/${artigo.demonstracao}`)).toBe(true);
  expect(erros).toEqual([]);
});

test('seis novos artigos têm foto, texto, relacionados e acesso ao cenário correto', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const artigo of POSTS_DEMONSTRACAO) {
    await page.goto(`/blog/${artigo.slug}`);
    await expect(page.getByRole('heading', { level: 1, name: artigo.titulo })).toBeVisible();
    const imagem = page.locator('.px65-capa img');
    await expect
      .poll(() => imagem.evaluate((img) => (img as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
    await expect(page.locator('.px65-corpo ol li')).toHaveCount(5);
    await expect(page.locator('.px65-relacionados a')).toHaveCount(artigo.relacionados.length);
    await page.getByRole('link', { name: 'Ver cenário da demonstração', exact: true }).click();
    await expect(page).toHaveURL(`/demonstracao/${artigo.demonstracao}`);
    await expect(page.locator('.hero')).toBeVisible();
  }
});

test('blog e páginas públicas usam Financiador no contexto da plataforma', async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const rota of [
    '/',
    '/investidores',
    '/como-funciona',
    '/credito-pj',
    '/perguntas-frequentes',
    '/blog',
  ]) {
    await page.goto(rota);
    await expect(page.locator('h1').first()).toBeVisible();
    const texto = (await page.locator('body').innerText()).replace(
      /investidor(?:es|as|a)?\s+(?:(?:não|nao)\s+)?qualificad[oa]s?/gi,
      'categoria regulatória',
    );
    expect(texto, rota).not.toMatch(/\binvestidor(?:es|as|a)?\b/i);
  }
  await page.getByRole('button', { name: /^Para financiadores/ }).click();
  await expect(page.locator(`a[href="/blog/demonstracao-financiador"]`)).toBeVisible();
});
