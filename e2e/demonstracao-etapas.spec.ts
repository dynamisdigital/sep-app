import { expect, test } from '@playwright/test';

for (const perfil of [
  'cliente',
  'subcorrespondente',
  'correspondente',
  'backoffice',
  'financiador',
  'operacao_completa',
]) {
  for (let indice = 0; indice < 5; indice++) {
    test(`${perfil}: cartão ${indice + 1} executa somente sua etapa e retorna`, async ({
      page,
    }) => {
      test.setTimeout(300_000);
      await page.setViewportSize({ width: 1706, height: 1258 });
      await page.addInitScript(() => {
        localStorage.setItem('NG_APP_USE_MSW', 'true');
        localStorage.setItem('SEP_TOUR_NARRACAO', 'false');
        localStorage.setItem('SEP_TOUR_MUSICA', 'false');
      });
      await page.goto(`/demonstracao/${perfil}`);
      const cartao = page.locator('.etapas li').nth(indice);
      const titulo = await cartao.locator('h3').innerText();
      await cartao.getByRole('button').click();
      const dialogo = page.getByRole('dialog', { name: 'Tour assistido' });
      await expect(dialogo).toBeVisible();
      await expect(dialogo.locator('header small')).toContainText(titulo);
      await expect(dialogo.locator('.sep-tour-texto')).toContainText('somente esta etapa');
      await expect(page.locator('.sep-tour-secoes')).toHaveCount(0);
      await page.locator('button[aria-label^="Velocidade"]').click();
      await page.locator('button[aria-label^="Velocidade"]').click();
      await page.locator('button[aria-label^="Velocidade"]').click();
      const aviso = page.locator('.sep-tour-aviso');
      const limite = Date.now() + 260_000;
      const titulos = new Set<string>();
      while (Date.now() < limite) {
        await expect(dialogo.locator('header small')).toContainText(titulo);
        if (await aviso.count()) break;
        titulos.add(await dialogo.locator('h3').innerText());
        const proximo = dialogo.getByRole('button', { name: 'Próximo', exact: true });
        if (await proximo.isVisible()) await proximo.click();
        await page.waitForTimeout(300);
      }
      await expect(aviso).toHaveAttribute('data-tone', 'green');
      await expect(dialogo.locator('h3')).toHaveText(
        `Etapa ${String(indice + 1).padStart(2, '0')} concluída`,
      );
      expect(titulos.size).toBeGreaterThan(4);
      await expect(page).toHaveURL(`/demonstracao/${perfil}`, { timeout: 10_000 });
      await expect(dialogo).toHaveCount(0);
    });
  }
}
