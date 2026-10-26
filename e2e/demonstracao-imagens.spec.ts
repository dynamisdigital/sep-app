import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EXPERIENCIAS_VISUAIS } from '../src/app/features/public/demonstracao/demonstracao-apresentacao';

test('originais permanecem intactos e todas as versões PNG/WebP estão disponíveis', async ({
  request,
}) => {
  const raiz = resolve('image/demonstracao');
  const hashes = JSON.parse(
    readFileSync(resolve(raiz, 'versoes/telas-escuras/originais-sha256.json'), 'utf8'),
  );
  for (const { arquivo, sha256 } of hashes) {
    const atual = createHash('sha256')
      .update(readFileSync(resolve(raiz, arquivo)))
      .digest('hex');
    expect(atual.toUpperCase(), arquivo).toBe(sha256);
  }
  const manifesto = JSON.parse(
    readFileSync(resolve(raiz, 'versoes/telas-escuras/edicoes.json'), 'utf8'),
  );
  for (const { key } of manifesto.imagens) {
    for (const extensao of ['png', 'webp']) {
      const resposta = await request.get(
        `/image/demonstracao/versoes/telas-escuras/${key}.${extensao}`,
      );
      expect(resposta.ok(), `${key}.${extensao}`).toBe(true);
      expect(resposta.headers()['content-type']).toContain(`image/${extensao}`);
    }
  }
});

test('comparação restaura os originais, persiste ao recarregar e vale entre os cenários', async ({
  page,
}) => {
  await page.goto('/demonstracao/backoffice');
  const escolha = page.getByLabel('Imagens', { exact: true });
  await expect(escolha).toHaveValue('telas-escuras');
  const foto = page.locator('.hero picture img');
  await expect(foto).toHaveAttribute('src', /assets\/backoffice\/06_backoffice_banner/);
  await escolha.selectOption('originais');
  await expect(foto).toHaveAttribute('src', /\/assets\/backoffice/);
  await page.reload();
  await expect(escolha).toHaveValue('originais');
  await expect(foto).toHaveAttribute('src', /\/assets\/backoffice/);
  await page.goto('/demonstracao/cliente');
  await expect(escolha).toHaveValue('originais');
  const cadastro = page.locator('.etapas li').first().locator('img');
  await expect(cadastro).toHaveAttribute('src', /\/assets\/cliente/);
  await escolha.selectOption('telas-escuras');
  await expect(cadastro).toHaveAttribute('src', /telas-escuras\/cliente/);
  await expect
    .poll(() => cadastro.evaluate((img) => (img as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
});

test('fotos editadas carregam nos seis cenários e a comparação cabe no celular', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1706, height: 1258 });
  for (const perfil of EXPERIENCIAS_VISUAIS) {
    await page.goto(`/demonstracao/${perfil.id}`);
    await expect(page.locator('.hero')).toBeVisible();
    for (const foto of await page.locator('.demonstracao img').all()) {
      await expect
        .poll(() => foto.evaluate((img) => (img as HTMLImageElement).naturalWidth))
        .toBeGreaterThan(0);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1),
      perfil.id,
    ).toBe(true);
    await page.screenshot({ path: `test-results/fotos-escuras-${perfil.id}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/demonstracao/backoffice');
  await expect(page.getByLabel('Imagens', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});
