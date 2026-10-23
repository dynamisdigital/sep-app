import { expect, test } from '@playwright/test';

// Operação completa nas telas reais (tour assistido), em modo MSW/dev-offline: o tour parte da página
// inicial, entra com cinco perfis e percorre a operação do vínculo do sub-correspondente ao retorno do
// credor, mais as tentativas de acesso barradas. Aqui o teste só conduz e confere o desfecho: as regras
// de cada passo estão nos próprios roteiros, que param (aviso âmbar) quando uma tela não responde.

test.setTimeout(10 * 60_000);

test('a jornada completa percorre os cinco perfis e conclui sem erro', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('NG_APP_USE_MSW', 'true');
    // Sem voz nem música: o teste não precisa de áudio, e a narração só atrasaria o ritmo.
    localStorage.setItem('SEP_TOUR_NARRACAO', 'false');
    localStorage.setItem('SEP_TOUR_MUSICA', 'false');
  });
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));

  // Navega pela página inicial e só por cliques: recarregar a página devolveria os dados ao início.
  await page.goto('/');
  await page.locator('[data-jornada-acesso]').click();

  const velocidade = page.locator('button[aria-label^="Velocidade"]');
  await velocidade.waitFor();
  await velocidade.click();
  await velocidade.click();

  const aviso = page.locator('.sep-tour-aviso');
  await aviso.waitFor({ timeout: 9 * 60_000 });
  await expect(aviso).toHaveAttribute('data-tone', 'green');

  // O último capítulo termina na tela de acesso negado: o backoffice barrado na gestão de usuários.
  await expect(page).toHaveURL(/\/access-denied/);
  expect(erros).toEqual([]);
});
