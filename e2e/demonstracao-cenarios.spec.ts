import { expect, test } from '@playwright/test';

const CENARIOS = [
  ['subcorrespondente', 'Subcorrespondente'],
  ['correspondente', 'Correspondente'],
  ['cliente', 'Cliente'],
  ['backoffice', 'Backoffice'],
  ['financiador', 'Financiador'],
] as const;

for (const [perfil, nome] of CENARIOS) {
  test(`cenário ${perfil} começa, conclui e retorna somente ao perfil escolhido`, async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1706, height: 1258 });
    await page.addInitScript(() => {
      localStorage.setItem('NG_APP_USE_MSW', 'true');
      localStorage.setItem('SEP_TOUR_NARRACAO', 'false');
      localStorage.setItem('SEP_TOUR_MUSICA', 'false');
    });
    const erros: string[] = [];
    page.on('pageerror', (erro) => erros.push(erro.message));
    await page.goto(`/demonstracao/${perfil}`);
    await page.locator('.hero .botao').click();
    const dialogo = page.getByRole('dialog', { name: 'Tour assistido' });
    await expect(dialogo).toBeVisible();
    await expect(dialogo.locator('header small')).toContainText(`Cenário: ${nome}`);
    await expect(page.locator('.sep-tour-secoes')).toHaveCount(0);
    await expect(dialogo.locator('.sep-tour-texto')).toContainText('começa e termina');
    await page.locator('button[aria-label^="Velocidade"]').click();
    await page.locator('button[aria-label^="Velocidade"]').click();
    await page.locator('button[aria-label^="Velocidade"]').click();
    const aviso = page.locator('.sep-tour-aviso');
    const limite = Date.now() + 260_000;
    while (Date.now() < limite) {
      await expect(dialogo.locator('header small')).toContainText(`Cenário: ${nome}`);
      await expect(page.locator('.sep-tour-secoes')).toHaveCount(0);
      if (await aviso.count()) break;
      const proximo = dialogo.getByRole('button', { name: 'Próximo', exact: true });
      if (await proximo.isVisible()) await proximo.click();
      await page.waitForTimeout(350);
    }
    await expect(aviso).toHaveAttribute('data-tone', 'green');
    await expect(dialogo.locator('h3')).toContainText(`Cenário ${nome} concluído`);
    await expect(page).toHaveURL(`/demonstracao/${perfil}`, { timeout: 10_000 });
    await expect(dialogo).toHaveCount(0);
    expect(erros).toEqual([]);
  });
}
