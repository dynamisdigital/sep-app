import { expect, test } from '@playwright/test';

for (const [width, height] of [
  [1280, 945],
  [1366, 768],
  [1920, 1080],
]) {
  test(`home em 100% mantém letras e enquadramento em ${width}x${height}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('.landing-header')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-jornada-acesso], .landing-jornada')).toHaveCount(0);
    await expect(page.locator('.landing-nav a[href="/demonstracao"]')).toHaveCount(1);
    const linhasMenu = await page
      .locator('.landing-nav a')
      .evaluateAll(
        (links) => new Set(links.map((el) => Math.round(el.getBoundingClientRect().top))).size,
      );
    expect(linhasMenu).toBe(1);
    const quadro = page.locator('.sep-viewport');
    expect(await quadro.evaluate((el) => Number(getComputedStyle(el).zoom))).toBe(1);
    const fonte = await page.locator('.hero-slide.ativo .hero-lead').evaluate((el) => {
      const estilo = getComputedStyle(el);
      const fonte = Number.parseFloat(estilo.fontSize);
      const escala = Number(getComputedStyle(el.closest('.sep-viewport')!).zoom);
      return fonte * escala;
    });
    expect(fonte).toBeGreaterThanOrEqual(16);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await page.screenshot({
      path: `test-results/home-100-${width}.png`,
      fullPage: true,
      animations: 'disabled',
    });
  });
}

test('home, demonstração e login usam a mesma escala e tipografia', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  const quadro = page.locator('.sep-viewport');
  await expect(page.locator('.landing-header')).toBeVisible({ timeout: 15_000 });
  const menuHome = await page
    .locator('.landing-nav')
    .evaluate((el) => getComputedStyle(el).fontSize);
  const marcaHome = await page
    .locator('.landing-brand-text strong')
    .evaluate((el) => getComputedStyle(el).fontSize);
  await page.getByRole('link', { name: 'Demonstração', exact: true }).click();
  await expect(quadro).toHaveClass(/sep-viewport-demo/);
  expect(await quadro.evaluate((el) => Number(getComputedStyle(el).zoom))).toBe(1);
  expect(await page.locator('.site-nav').evaluate((el) => getComputedStyle(el).fontSize)).toBe(
    menuHome,
  );
  expect(
    await page.locator('.site-brand-text strong').evaluate((el) => getComputedStyle(el).fontSize),
  ).toBe(marcaHome);
  await page.getByRole('link', { name: 'Início', exact: true }).click();
  await expect(page.locator('.landing-header')).toBeVisible();
  await expect(quadro).not.toHaveClass(/sep-viewport-demo/);
  expect(await quadro.evaluate((el) => Number(getComputedStyle(el).zoom))).toBe(1);
  await page.getByRole('link', { name: 'Entrar', exact: true }).click();
  await expect(page.locator('#login-username')).toBeVisible();
  expect(await quadro.evaluate((el) => Number(getComputedStyle(el).zoom))).toBe(1);
});
