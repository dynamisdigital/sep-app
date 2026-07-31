import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { VerifyTotpComponent } from './verify-totp.component';
import { errorInterceptor } from '../../../../core/interceptors/error.interceptor';
import { server } from '../../../../../mocks/server';

const VERIFY_URL = 'http://localhost:8080/api/v1/auth/totp/verify';
const PENDING_MFA_CHALLENGE_KEY = 'SEP_PENDING_MFA_CHALLENGE';

/**
 * Versao regex para os asserts de ausencia. `queryByText` com string compara o texto normalizado do
 * no INTEIRO, entao uma mensagem que apenas *contenha* a copy de codigo invalido escaparia — e o
 * usuario voltaria a ser acusado de digitar o codigo errado num 423, num 429 ou numa queda de rede,
 * que e exatamente o bug desta Task.
 */
const ACUSA_CODIGO = /codigo (totp )?invalido/i;

/**
 * O componente le `pendingMfaChallenge` no construtor, e o AuthService inicializa esse signal a
 * partir do localStorage. Sem semear a chave ANTES do render, todo teste cai no ramo
 * `challengeAusente` e o formulario nem existe no DOM — o spec passaria sem exercitar nada.
 */
function semearChallenge(valor = 'challenge-1'): void {
  window.localStorage.setItem(PENDING_MFA_CHALLENGE_KEY, valor);
}

/**
 * `comInterceptors` monta a cadeia HTTP real, para provar que a navegacao do 423 vem do
 * errorInterceptor e nao do componente. O ramo sem interceptor prova que o mapeamento de mensagem
 * independe do redirect.
 */
async function setup(opts: { comInterceptors?: boolean } = {}) {
  return render(VerifyTotpComponent, {
    providers: [
      // provideRouter([]) DE PROPOSITO sem as rotas reais: registrar /account-locked deixaria uma
      // navegacao de verdade acontecer e mascararia um stub de navigateByUrl faltando.
      provideRouter([]),
      opts.comInterceptors
        ? provideHttpClient(withInterceptors([errorInterceptor]))
        : provideHttpClient(),
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

/**
 * Handler por teste, nao permanente: `src/mocks/handlers.ts` nao tem nenhuma rota de /auth/totp/*,
 * e adicionar uma la mudaria o comportamento de specs distantes.
 */
function stubVerify(resposta: () => Response): void {
  server.use(http.post(VERIFY_URL, resposta));
}

/** Corpo `ErrorResponseDto` no formato que o sep-api realmente emite. */
function erroDaApi(status: number, error: string, message: string): Response {
  return HttpResponse.json(
    { timestamp: '2026-07-31T09:00:00Z', status, error, message, path: '/api/v1/auth/totp/verify' },
    { status },
  );
}

function espiarNavegacao(fixture: ComponentFixture<unknown>): () => string | null {
  const router = fixture.debugElement.injector.get(Router);
  let destino: string | null = null;
  router.navigateByUrl = (url: string) => {
    destino = url;
    return Promise.resolve(true);
  };
  return () => destino;
}

function preencherEEnviar(codigo = '123456'): void {
  fireEvent.input(screen.getByTestId('sep-verify-totp-input'), { target: { value: codigo } });
  fireEvent.click(screen.getByTestId('sep-verify-totp-submit'));
}

function textoDoErro(): string {
  return screen.getByTestId('sep-verify-totp-error').textContent?.trim() ?? '';
}

/** O CTA precisa voltar a ser clicavel apos erro, senao so um reload permite tentar de novo. */
function esperarCtaLiberado(): void {
  const cta = screen.getByTestId('sep-verify-totp-submit') as HTMLButtonElement;
  expect(cta.disabled).toBe(false);
}

describe('VerifyTotpComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  // O landmark fica FORA do @if, entao tem de existir nos dois ramos. Um teste por ramo: o
  // TestBed nao aceita dois `render` no mesmo teste.
  it('expoe a regiao principal nomeada pelo heading no ramo sem challenge', async () => {
    await setup();

    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Verificacao em duas etapas' })).toBeTruthy();
  });

  it('expoe a regiao principal nomeada pelo heading no ramo com formulario', async () => {
    semearChallenge();
    await setup();

    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Verificacao em duas etapas' })).toBeTruthy();
    expect(screen.getByTestId('sep-verify-totp-input')).toBeTruthy();
  });

  it('mostra o ramo de sessao expirada quando nao ha challenge pendente', async () => {
    await setup();
    expect(screen.getByTestId('sep-verify-totp-no-challenge')).toBeTruthy();
    expect(screen.queryByTestId('sep-verify-totp-input')).toBeNull();
  });

  // As tres causas do 400 (codigo invalido, challenge expirado, MFA nao habilitado) chegam com
  // `message` distinto e o ErrorResponseDto nao serializa o codigo: o corpo e o unico discriminador.
  it('usa o message do corpo no 400 em vez de fixar uma unica causa', async () => {
    semearChallenge();
    stubVerify(() =>
      erroDaApi(400, 'Bad Request', 'Desafio MFA invalido ou expirado. Refaca o login.'),
    );
    const { fixture } = await setup();
    preencherEEnviar();
    await estabilizar(fixture);

    expect(textoDoErro()).toBe('Desafio MFA invalido ou expirado. Refaca o login.');
    esperarCtaLiberado();
  });

  it('cai no literal do 400 quando o corpo nao traz message', async () => {
    semearChallenge();
    stubVerify(() => new HttpResponse(null, { status: 400 }));
    const { fixture } = await setup();
    preencherEEnviar();
    await estabilizar(fixture);

    expect(textoDoErro()).toBe(
      'Codigo invalido ou desafio expirado. Refaca o login e tente de novo.',
    );
  });

  it('nao acusa codigo invalido no 423 e usa o prazo que o backend informou', async () => {
    semearChallenge();
    stubVerify(() =>
      erroDaApi(423, 'Locked', 'Conta bloqueada temporariamente. Tente novamente em 45 minutos.'),
    );
    const { fixture } = await setup();
    preencherEEnviar();
    await estabilizar(fixture);

    expect(textoDoErro()).toBe('Conta bloqueada temporariamente. Tente novamente em 45 minutos.');
    expect(screen.queryByText(ACUSA_CODIGO)).toBeNull();
  });

  it('nao acusa codigo invalido no 429', async () => {
    semearChallenge();
    stubVerify(() =>
      erroDaApi(
        429,
        'Too Many Requests',
        'Limite de requisicoes excedido. Aguarde antes de tentar novamente.',
      ),
    );
    const { fixture } = await setup();
    preencherEEnviar();
    await estabilizar(fixture);

    expect(textoDoErro()).toBe(
      'Muitas tentativas seguidas. Aguarde cerca de 1 minuto e tente de novo.',
    );
    expect(screen.queryByText(ACUSA_CODIGO)).toBeNull();
  });

  it('nao acusa codigo invalido no 5xx e preserva o message com o codigo de suporte', async () => {
    semearChallenge();
    stubVerify(() =>
      erroDaApi(500, 'Internal Server Error', 'Falha interna. Codigo de suporte: abc-123'),
    );
    const { fixture } = await setup({ comInterceptors: true });
    preencherEEnviar();
    await estabilizar(fixture);

    expect(textoDoErro()).toContain('abc-123');
    expect(screen.queryByText(ACUSA_CODIGO)).toBeNull();
  });

  it('nao acusa codigo invalido em falha de rede', async () => {
    semearChallenge();
    stubVerify(() => HttpResponse.error());
    const { fixture } = await setup();
    preencherEEnviar();
    await estabilizar(fixture);

    expect(textoDoErro()).toBe(
      'Nao foi possivel verificar o codigo agora. Verifique sua conexao e tente de novo.',
    );
    expect(screen.queryByText(ACUSA_CODIGO)).toBeNull();
  });

  // A navegacao do 423 e responsabilidade unica do errorInterceptor. Se o componente passar a
  // navegar, o clearSession() do interceptor deixa de ser garantido no caminho.
  it('nao navega no 423 por conta propria, sem a cadeia de interceptors', async () => {
    semearChallenge();
    stubVerify(() => erroDaApi(423, 'Locked', 'Conta bloqueada temporariamente.'));
    const { fixture } = await setup();
    const destino = espiarNavegacao(fixture);
    preencherEEnviar();
    await estabilizar(fixture);

    expect(destino()).toBeNull();
    expect(screen.getByTestId('sep-verify-totp-error')).toBeTruthy();
  });

  it('deixa o errorInterceptor levar a /account-locked no 423', async () => {
    semearChallenge();
    stubVerify(() => erroDaApi(423, 'Locked', 'Conta bloqueada temporariamente.'));
    const { fixture } = await setup({ comInterceptors: true });
    const destino = espiarNavegacao(fixture);
    preencherEEnviar();
    await estabilizar(fixture);

    expect(destino()).toBe('/account-locked');
  });

  it('conclui o login e vai para o dashboard quando o codigo e aceito', async () => {
    semearChallenge();
    stubVerify(() =>
      HttpResponse.json({
        accessToken: 'token-1',
        tokenType: 'Bearer',
        expiresIn: 900,
        usuario: { id: 'u1', nome: 'Fulano', email: 'a@b.com', role: 'CLIENTE' },
      }),
    );
    const { fixture } = await setup();
    const destino = espiarNavegacao(fixture);
    preencherEEnviar();
    await estabilizar(fixture);

    expect(destino()).toBe('/app/dashboard');
    expect(screen.queryByTestId('sep-verify-totp-error')).toBeNull();
  });
});
