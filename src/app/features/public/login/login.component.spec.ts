import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/angular';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { importProvidersFrom } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { http, HttpResponse } from 'msw';
import { throwError } from 'rxjs';

import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/auth/auth.service';
import { LUCIDE_ICONS } from '../../../core/icons/lucide-icons';
import { errorInterceptor } from '../../../core/interceptors/error.interceptor';
import { server } from '../../../../mocks/server';
import { resetLoginMockState } from '../../../../mocks/handlers';

const LOGIN_URL = 'http://localhost:8080/api/v1/auth/login';
/** Texto exato do 401, para o assert positivo. */
const COPY_CREDENCIAL = 'E-mail ou senha invalidos.';
/**
 * Versao regex para os asserts de ausencia. `queryByText` com string compara o texto normalizado
 * do no INTEIRO, entao uma mensagem que apenas *contenha* a copy de credencial escaparia — e o
 * usuario voltaria a ser acusado de errar a senha num 400 ou num 5xx, que e o bug desta sprint.
 */
const ACUSA_CREDENCIAL = /e-mail ou senha invalidos/i;

/**
 * `comInterceptors` monta a cadeia HTTP real. Antes desta sprint o spec usava
 * `provideHttpClient()` pelado — sem nenhum interceptor —, entao um 423 nunca redirecionaria aqui
 * e o spec era inutil para o bug que a F-Sprint 21 corrige. O ramo sem interceptor continua
 * existindo para provar que o mapeamento de mensagem independe do redirect.
 */
async function setup(opts: { comInterceptors?: boolean } = {}) {
  return render(LoginComponent, {
    providers: [
      // provideRouter([]) DE PROPOSITO sem a rota account-locked: registrar a rota real deixaria
      // uma navegacao de verdade acontecer e mascararia um stub de navigateByUrl faltando.
      provideRouter([]),
      opts.comInterceptors
        ? provideHttpClient(withInterceptors([errorInterceptor]))
        : provideHttpClient(),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
    ],
  });
}

async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

async function estabilizar(fixture: ComponentFixture<unknown>): Promise<void> {
  await fixture.whenStable();
  await flush();
  fixture.detectChanges();
}

function stubLogin(resposta: () => Response): void {
  server.use(http.post(LOGIN_URL, resposta));
}

/** Corpo `ErrorResponseDto` no formato que o sep-api realmente emite. */
function erroDaApi(status: number, error: string, message: string): Response {
  return HttpResponse.json(
    { timestamp: '2026-07-30T09:00:00Z', status, error, message, path: '/api/v1/auth/login' },
    { status },
  );
}

/** Captura `navigateByUrl` e devolve o leitor da ultima rota pedida. */
function espiarNavegacao(fixture: ComponentFixture<unknown>): () => string | null {
  const router = fixture.debugElement.injector.get(Router);
  let destino: string | null = null;
  router.navigateByUrl = (url: string) => {
    destino = url;
    return Promise.resolve(true);
  };
  return () => destino;
}

// '123456' e a senha de sucesso do mock (handlers.ts); 'a@b.com' nao existe em `loginUsuarios` e
// por isso o default do helper cai em 401. Trocar qualquer um dos dois quebra testes distantes.
function preencherEEnviar(username = 'a@b.com', password = '123456'): void {
  fireEvent.input(screen.getByLabelText(/e-mail/i), { target: { value: username } });
  fireEvent.input(screen.getByLabelText(/senha/i), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
}

/** O CTA precisa voltar a ser clicavel apos erro, senao so um reload permite tentar de novo. */
function esperarCtaLiberado(): void {
  const cta = screen.getByRole('button', { name: /entrar/i }) as HTMLButtonElement;
  expect(cta.disabled).toBe(false);
}

describe('LoginComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // O contador de lockout e o usuario da sessao do mock sao estado de modulo; sem reset as
    // falhas deste arquivo acumulariam e um caso posterior receberia 423 sem pedir.
    resetLoginMockState();
  });

  it('campos vazios: submit nao chama login', async () => {
    const result = await setup();
    const auth = result.fixture.debugElement.injector.get(AuthService);
    let called = false;
    auth.login = (() => {
      called = true;
      throw new Error('nao deveria ser chamado');
    }) as never;

    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    expect(called).toBe(false);
    expect(screen.getByText('E-mail obrigatorio.')).toBeTruthy();
    expect(screen.getByText('Informe sua senha.')).toBeTruthy();
  });

  it('e-mail invalido bloqueia submit', async () => {
    await setup();
    preencherEEnviar('nao-eh-email');

    expect(screen.getByText('Informe um e-mail valido.')).toBeTruthy();
  });

  it('senha vazia mantem botao desabilitado', async () => {
    await setup();
    preencherEEnviar('a@b.com', '');

    expect(screen.getByText('Informe sua senha.')).toBeTruthy();
  });

  it('credenciais validas: redireciona para /app/dashboard', async () => {
    const result = await setup();
    const navegouPara = espiarNavegacao(result.fixture);

    preencherEEnviar('admin@empresa.com');

    await result.fixture.whenStable();
    await flush();

    expect(navegouPara()).toBe('/app/dashboard');
  });

  it('401: mostra erro de credencial e libera o CTA', async () => {
    const result = await setup();
    preencherEEnviar('wrong@empresa.com', '999999');

    await estabilizar(result.fixture);

    expect(screen.getByText(COPY_CREDENCIAL)).toBeTruthy();
    esperarCtaLiberado();
  });

  it('423 com o errorInterceptor na cadeia: navega para /account-locked e o erro chega na tela', async () => {
    stubLogin(() =>
      erroDaApi(423, 'Locked', 'Conta bloqueada temporariamente. Tente novamente em 30 minutos.'),
    );
    const result = await setup({ comInterceptors: true });
    const navegouPara = espiarNavegacao(result.fixture);

    preencherEEnviar('admin@empresa.com');

    await estabilizar(result.fixture);

    // As duas metades juntas: o interceptor navega E repropaga, entao o fallback do componente e
    // alcancavel. Sem o segundo assert, um interceptor que engolisse o erro passaria aqui.
    expect(navegouPara()).toBe('/account-locked');
    expect(screen.getByText(/conta bloqueada temporariamente/i)).toBeTruthy();
  });

  it('423 sem interceptor: ecoa a duracao do backend e nao navega por conta propria', async () => {
    // Duracao diferente de 30 de proposito: `app.security.lockout.lockout-minutes` e
    // sobrescrevivel por ambiente, entao o literal do componente nao pode ganhar do corpo.
    stubLogin(() =>
      erroDaApi(423, 'Locked', 'Conta bloqueada temporariamente. Tente novamente em 15 minutos.'),
    );
    const result = await setup();
    const navegouPara = espiarNavegacao(result.fixture);

    preencherEEnviar('admin@empresa.com');

    await estabilizar(result.fixture);

    expect(screen.getByText(/15 minutos/i)).toBeTruthy();
    expect(screen.queryByText(ACUSA_CREDENCIAL)).toBeNull();
    // O redirect do 423 e responsabilidade unica do errorInterceptor; o componente nao duplica.
    expect(navegouPara()).toBeNull();
  });

  it('423 sem corpo: cai no literal local em vez de ficar mudo', async () => {
    stubLogin(() => new HttpResponse(null, { status: 423 }));
    const result = await setup();
    preencherEEnviar('admin@empresa.com');

    await estabilizar(result.fixture);

    expect(screen.getByText(/conta bloqueada temporariamente/i)).toBeTruthy();
    expect(screen.getByText(/30 minutos/i)).toBeTruthy();
  });

  it('429: orienta a aguardar e nao acusa senha invalida', async () => {
    stubLogin(() =>
      erroDaApi(
        429,
        'Too Many Requests',
        'Limite de requisicoes excedido. Aguarde antes de tentar novamente.',
      ),
    );
    const result = await setup();
    preencherEEnviar('admin@empresa.com');

    await estabilizar(result.fixture);

    expect(screen.getByText(/muitas tentativas seguidas/i)).toBeTruthy();
    expect(screen.getByText(/1 minuto/i)).toBeTruthy();
    expect(screen.queryByText(ACUSA_CREDENCIAL)).toBeNull();
    esperarCtaLiberado();
  });

  it('400: mensagem de dados invalidos', async () => {
    stubLogin(() => erroDaApi(400, 'Bad Request', 'username: deve ser um e-mail bem formado'));
    const result = await setup();
    preencherEEnviar('admin@empresa.com');

    await estabilizar(result.fixture);

    expect(screen.getByText(/dados invalidos/i)).toBeTruthy();
    expect(screen.queryByText(ACUSA_CREDENCIAL)).toBeNull();
  });

  it('500: entrega a mensagem da api, nunca senha invalida nem culpa da conexao', async () => {
    stubLogin(() =>
      erroDaApi(500, 'Internal Server Error', 'Erro interno. Codigo de suporte: trace-abc.'),
    );
    const result = await setup();
    preencherEEnviar('admin@empresa.com');

    await estabilizar(result.fixture);

    // O errorInterceptor injeta o codigo de suporte no `message` em 5xx; descartar o corpo tiraria
    // o traceId do usuario e o mandaria conferir a conexao a toa.
    expect(screen.getByText(/codigo de suporte: trace-abc/i)).toBeTruthy();
    expect(screen.queryByText(ACUSA_CREDENCIAL)).toBeNull();
    expect(screen.queryByText(/verifique sua conexao/i)).toBeNull();
  });

  it('falha de rede: mensagem generica, nunca senha invalida', async () => {
    // `HttpResponse.error()` chega no Angular como status 0, o mesmo de CORS e offline.
    stubLogin(() => HttpResponse.error());
    const result = await setup();
    preencherEEnviar('admin@empresa.com');

    await estabilizar(result.fixture);

    expect(screen.getByText(/verifique sua conexao/i)).toBeTruthy();
    expect(screen.queryByText(ACUSA_CREDENCIAL)).toBeNull();
    esperarCtaLiberado();
  });

  it('erro fora do fio: login aceito mas token nao persistido nao vira falha de credencial', async () => {
    const result = await setup();
    const auth = result.fixture.debugElement.injector.get(AuthService);
    // Caminho real: `AuthService.login` faz `.pipe(tap(handleTokenResponse))`, e o `tap` roda
    // DEPOIS do 200 — fora do alcance do errorInterceptor. Se o `localStorage.setItem` estourar
    // (cota cheia, modo privado do Safari), o componente recebe um DOMException sem `status`.
    // Simulado aqui porque `window.localStorage` e um proxy que ignora substituicao de metodo.
    auth.login = (() => throwError(() => new DOMException('quota', 'QuotaExceededError'))) as never;

    preencherEEnviar('admin@empresa.com');

    await estabilizar(result.fixture);

    // Sem a guarda de `instanceof HttpErrorResponse`, `erro.status` seria undefined, cairia no
    // default e culparia a conexao — num login que o servidor aceitou.
    expect(screen.getByText(/armazenamento local/i)).toBeTruthy();
    expect(screen.queryByText(ACUSA_CREDENCIAL)).toBeNull();
    expect(screen.queryByText(/verifique sua conexao/i)).toBeNull();
  });
});
