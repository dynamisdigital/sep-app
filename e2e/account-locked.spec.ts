import { expect, test } from '@playwright/test';

import { defaultPassword } from './fixtures/users';

const SENHA_ERRADA = 'senha-errada-de-proposito';

test.beforeEach(async ({ page }) => {
  // `ng serve` usa a configuracao development, com useMsw: false — o smoke precisa ligar o MSW.
  await page.addInitScript(() => window.localStorage.setItem('NG_APP_USE_MSW', 'true'));
});

// Controle positivo do teste seguinte. Sem ele, uma derivacao em `defaultPassword` degrada o smoke
// de lockout para "6 senhas erradas -> bloqueio" em silencio — propriedade muito mais fraca, e que
// deixaria de provar a ordem de avaliacao do backend. Verificado por mutacao: quebrar a fixture
// mantinha o teste de lockout verde.
test('controle positivo: a senha do fixture realmente autentica', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/e-mail/i).fill('admin@empresa.com');
  await page.getByLabel(/^senha$/i).fill(defaultPassword);
  await page.getByRole('button', { name: /entrar/i }).click();

  await page.waitForURL(/\/app\/dashboard/, { timeout: 10_000 });
});

test('lockout: 5 senhas erradas e a proxima tentativa cai em /account-locked', async ({ page }) => {
  await page.goto('/login');

  const email = page.getByLabel(/e-mail/i);
  const senha = page.getByLabel(/^senha$/i);
  const entrar = page.getByRole('button', { name: /entrar/i });

  await email.fill('admin@empresa.com');

  // Sem sleep: o CTA e [disabled]="loading()" e o Playwright espera actionability, entao os
  // cliques viram requisicoes sequenciais, sem sobreposicao. O estado do lockout vive no modulo do
  // bundle da pagina e morre com o BrowserContext, que o Playwright recria por teste
  // (`testIsolation: 'test'`, o default) — nao e o `fullyParallel`, que so controla escalonamento.
  // Por isso nao ha o que resetar aqui, ao contrario das specs Vitest.
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
  // Prova de que a politica veio do endpoint, e nao de literal no bundle: `15` nao existe em
  // nenhum lugar do codigo de producao, so em `GET /auth/politica-lockout`. Assertar `/30 minutos/`
  // seria mais fraco — o fallback estatico tambem diz 30, entao passaria com a chamada quebrada.
  // (Quem fixa a copy integral e `account-locked.component.spec.ts`; aqui e ponta a ponta.)
  await expect(page.getByText(/5 ou mais tentativas .*em 15 minutos/i)).toBeVisible();
  await expect(page.getByText(/nao existe liberacao manual/i)).toBeVisible();

  await page.getByRole('link', { name: /voltar ao login/i }).click();
  await page.waitForURL(/\/login$/, { timeout: 10_000 });
});

test('URL direta com token velho: a politica carrega e a pagina nao e perdida', async ({
  page,
}) => {
  // Unico lugar que exercita a cadeia real de interceptors do `app.config.ts`
  // (clientChannel -> auth -> stepUp -> error) — a spec Vitest monta a cadeia a mao.
  //
  // Sem a isencao de `/auth/politica-lockout` no authInterceptor, o token velho viaja, o mock
  // responde 401 (tripwire de `handlers.ts`) e o errorInterceptor faz clearSession() +
  // navigateByUrl('/login'): o usuario e ARRANCADO da pagina que acabou de abrir. Verificado por
  // mutacao — removendo a rota do array, quem falha primeiro e o assert do heading, porque a
  // pagina inteira vai embora.
  //
  // Os tres asserts cobrem falhas diferentes. O do heading tem auto-wait e pode satisfazer ANTES de
  // o 401 voltar, entao ele sozinho nao prova nada sobre o redirect; o do texto pega a degradacao
  // silenciosa para a copy de fallback (chamada quebrada, pagina no lugar); e o de URL, por ultimo e
  // com retry (`toHaveURL`, nao leitura sincrona de `page.url()`), e o que pega um redirect que
  // chegue milissegundos depois — e o unico que falha se a navegacao for tardia.
  await page.addInitScript(() => {
    window.localStorage.setItem('NG_APP_USE_MSW', 'true');
    window.localStorage.setItem('SEP_ACCESS_TOKEN', 'token-expirado-de-proposito');
  });

  await page.goto('/account-locked');

  await expect(
    page.getByRole('heading', { level: 1, name: /conta bloqueada temporariamente/i }),
  ).toBeVisible();
  await expect(page.getByText(/5 ou mais tentativas .*em 15 minutos/i)).toBeVisible();
  await expect(page).toHaveURL(/\/account-locked$/);
});
