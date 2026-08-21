import { expect, test } from '@playwright/test';

const AVISO = 'Aviso de cookies';

/**
 * Jornada de PRIMEIRA VISITA. Roda sem semear `localStorage`, de proposito: e o unico caminho em
 * que a faixa aparece, e blindar a suite inteira contra ela esconderia justamente o que esta sprint
 * entrega.
 */
test('primeira visita ve o aviso, dispensa e nao o reve', async ({ page }) => {
  await page.goto('/');

  const aviso = page.getByRole('region', { name: AVISO });
  await expect(aviso).toBeVisible();

  await page.getByRole('button', { name: 'Entendi' }).click();
  await expect(aviso).toBeHidden();

  await page.reload();
  await expect(page.getByRole('region', { name: AVISO })).toBeHidden();
});

test('o aviso leva a politica de privacidade', async ({ page }) => {
  await page.goto('/');

  await page
    .getByRole('region', { name: AVISO })
    .getByRole('link', { name: /politica de privacidade/i })
    .click();

  await page.waitForURL(/\/politica-de-privacidade$/);
  await expect(
    page.getByRole('heading', { level: 1, name: /politica de privacidade/i }),
  ).toBeVisible();
});

/**
 * Regressao do defeito que a propria F-25.6 encontrou.
 *
 * Sendo `position: fixed` no rodape, a faixa cobria o ULTIMO elemento de qualquer pagina — e rolar
 * ate o fim nao resolvia. O `onboarding.spec.ts:42` reprovou com esta `<section>` nomeada pelo
 * Playwright como interceptadora dos ponteiros, em 51 tentativas de clique.
 *
 * Este teste mede o MECANISMO da correcao, nao uma consequencia dele: com a faixa visivel, o
 * documento tem de reservar pelo menos a altura dela. A primeira versao clicava num link do rodape
 * da landing e **sobreviveu a mutacao** que apagava a regra CSS — o link nao estava coberto, entao a
 * guarda nomeava-se guarda sem guardar nada. Comparar as duas alturas quebra assim que a classe, a
 * variavel ou a regra sumirem.
 *
 * O oraculo de ponta a ponta continua sendo o `onboarding.spec.ts`, onde o botao coberto era real.
 */
test('com o aviso visivel, o documento reserva a altura da faixa', async ({ page }) => {
  await page.goto('/');
  const aviso = page.getByRole('region', { name: AVISO });
  await expect(aviso).toBeVisible();

  const alturaDaFaixa = (await aviso.boundingBox())?.height ?? 0;
  expect(alturaDaFaixa).toBeGreaterThan(0);

  const reservado = await page.evaluate(
    () => parseFloat(getComputedStyle(document.body).paddingBottom) || 0,
  );
  expect(reservado).toBeGreaterThanOrEqual(alturaDaFaixa);

  await page.getByRole('button', { name: 'Entendi' }).click();
  await expect(aviso).toBeHidden();

  const reservadoDepois = await page.evaluate(
    () => parseFloat(getComputedStyle(document.body).paddingBottom) || 0,
  );
  expect(reservadoDepois).toBe(0);
});
