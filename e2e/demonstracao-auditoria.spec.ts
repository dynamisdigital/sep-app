import { expect, test } from '@playwright/test';
import { EXPERIENCIAS_VISUAIS } from '../src/app/features/public/demonstracao/demonstracao-apresentacao';

test('imagem, seta e link dos seis cartões abrem suas respectivas prévias', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1706, height: 1258 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [indice, perfil] of EXPERIENCIAS_VISUAIS.entries()) {
    for (const prefixo of ['Ver banner de ', 'Ver detalhes de ', 'Conhecer ']) {
      await page.goto('/demonstracao');
      for (let par = 0; par < Math.floor(indice / 2); par++)
        await page.getByRole('button', { name: 'Próximas jornadas', exact: true }).click();
      await page.getByRole('link', { name: prefixo + perfil.label, exact: true }).click();
      await expect(page).toHaveURL(`/demonstracao/${perfil.id}`);
      await expect(page.locator('.hero')).toBeVisible();
      await expect(page.getByRole('dialog', { name: 'Tour assistido' })).toHaveCount(0);
    }
  }
});

test('seis perfis preenchem a altura livre e mostram cinco etapas completas', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1706, height: 1258 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const erros: string[] = [];
  page.on('pageerror', (erro) => erros.push(erro.message));
  for (const perfil of EXPERIENCIAS_VISUAIS) {
    await page.goto(`/demonstracao/${perfil.id}`);
    await expect(page.locator('.hero')).toBeVisible();
    await expect(page.locator('.etapas li')).toHaveCount(5);
    await expect(page.locator('.etapas h2')).toContainText(perfil.etapasTitulo);
    const medidas = await page.evaluate(() => {
      const hero = document.querySelector('.hero')!.getBoundingClientRect();
      const nota = document.querySelector('.nota')!.getBoundingClientRect();
      const rodape = document.querySelector('.site-footer')!.getBoundingClientRect();
      return {
        alturaBanner: hero.height,
        espacoLivre: rodape.top - nota.bottom,
        documento: document.documentElement.scrollHeight,
        janela: innerHeight,
        largura: document.documentElement.scrollWidth,
        tela: innerWidth,
      };
    });
    expect(medidas.alturaBanner, perfil.id).toBeGreaterThan(390);
    expect(medidas.espacoLivre, perfil.id).toBeLessThanOrEqual(16);
    expect(medidas.documento, perfil.id).toBeLessThanOrEqual(medidas.janela + 1);
    expect(medidas.largura, perfil.id).toBeLessThanOrEqual(medidas.tela + 1);
    for (const foto of await page.locator('.demonstracao img').all())
      await expect
        .poll(() => foto.evaluate((img) => (img as HTMLImageElement).naturalWidth))
        .toBeGreaterThan(0);
    await page.screenshot({ path: `test-results/perfil-altura-${perfil.id}.png`, fullPage: true });
    await page.getByRole('link', { name: 'Voltar à galeria', exact: true }).click();
    await expect(page).toHaveURL('/demonstracao');
  }
  expect(erros).toEqual([]);
});

test('links do menu, rodapé e acesso das seis demonstrações têm destino funcional', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const destinos = new Set<string>();
  for (const perfil of EXPERIENCIAS_VISUAIS) {
    await page.goto(`/demonstracao/${perfil.id}`);
    await expect(page.locator('.hero')).toBeVisible();
    const links = await page
      .locator('sep-public-shell a[href]')
      .evaluateAll((ancoras) => ancoras.map((a) => a.getAttribute('href')!));
    for (const href of links) destinos.add(href);
  }
  for (const destino of destinos) {
    expect(destino).toMatch(/^\//);
    const resposta = await page.goto(destino);
    expect(resposta?.ok(), destino).toBe(true);
    await expect(page).toHaveURL(destino);
    await expect(page.locator('body')).not.toContainText(
      /Cannot GET|Página não encontrada|Perfil não encontrado/,
    );
    await expect(page.locator('h1, #login-username').first()).toBeVisible();
  }
});

for (const perfil of EXPERIENCIAS_VISUAIS) {
  test(`botão principal e cinco etapas abrem o tour de ${perfil.id}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.addInitScript(() => {
      localStorage.setItem('NG_APP_USE_MSW', 'true');
      localStorage.setItem('SEP_TOUR_NARRACAO', 'false');
      localStorage.setItem('SEP_TOUR_MUSICA', 'false');
    });
    for (let indice = -1; indice < 5; indice++) {
      await page.goto(`/demonstracao/${perfil.id}`);
      await expect(page.locator('.hero')).toBeVisible();
      const botao =
        indice < 0 ? page.locator('.hero .botao') : page.locator('.etapas li button').nth(indice);
      await expect(botao).toBeEnabled();
      await botao.click();
      await expect(page.getByRole('dialog', { name: 'Tour assistido' })).toBeVisible();
      await page.getByRole('button', { name: 'Sair do tour assistido', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Tour assistido' })).toHaveCount(0);
    }
  });
}
