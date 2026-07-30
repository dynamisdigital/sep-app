import { expect, test } from '@playwright/test';

import { defaultPassword } from './fixtures/users';

const SENHA_ERRADA = 'senha-errada-de-proposito';

test.beforeEach(async ({ page }) => {
  // `ng serve` usa a configuracao development, com useMsw: false — o smoke precisa ligar o MSW.
  await page.addInitScript(() => window.localStorage.setItem('NG_APP_USE_MSW', 'true'));
});

test('lockout: 5 senhas erradas e a proxima tentativa cai em /account-locked', async ({ page }) => {
  await page.goto('/login');

  const email = page.getByLabel(/e-mail/i);
  const senha = page.getByLabel(/^senha$/i);
  const entrar = page.getByRole('button', { name: /entrar/i });

  await email.fill('admin@empresa.com');

  // Sem sleep: o CTA e [disabled]="loading()" e o Playwright espera actionability, entao os
  // cliques viram requisicoes sequenciais, sem sobreposicao. O estado do lockout vive na pagina e
  // `fullyParallel` da um contexto proprio a cada teste.
  for (let tentativa = 1; tentativa <= 5; tentativa += 1) {
    await senha.fill(SENHA_ERRADA);
    await entrar.click();
    await expect(page.getByText('E-mail ou senha invalidos.')).toBeVisible();
  }

  // A 6a tentativa usa a senha CORRETA de proposito, e ainda assim cai no bloqueio. E fiel ao
  // backend: `AutenticarUsuarioUseCase` chama `lockoutService.verificar()` antes de avaliar a
  // credencial, entao a 5a senha errada ainda responde 401 e a conta so se revela trancada na 6a
  // requisicao. Escrever "5 cliques -> redirect" exigiria o mock mentir sobre o sep-api.
  await senha.fill(defaultPassword);
  await entrar.click();

  await page.waitForURL(/\/account-locked/, { timeout: 10_000 });
  await expect(
    page.getByRole('heading', { level: 1, name: /conta bloqueada temporariamente/i }),
  ).toBeVisible();
  await expect(page.getByText(/30 minutos/i)).toBeVisible();
  await expect(page.getByText(/nao existe liberacao manual/i)).toBeVisible();

  await page.getByRole('link', { name: /voltar ao login/i }).click();
  await page.waitForURL(/\/login/, { timeout: 10_000 });
});
