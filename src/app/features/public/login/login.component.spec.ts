import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/angular';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { http, HttpResponse } from 'msw';

import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/auth/auth.service';
import { LUCIDE_ICONS } from '../../../core/icons/lucide-icons';
import { errorInterceptor } from '../../../core/interceptors/error.interceptor';
import { server } from '../../../../mocks/server';
import { resetLoginMockState } from '../../../../mocks/handlers';

const LOGIN_URL = 'http://localhost:8080/api/v1/auth/login';
const COPY_CREDENCIAL = 'E-mail ou senha invalidos.';

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

function stubLogin(resposta: () => HttpResponse | Response): void {
  server.use(http.post(LOGIN_URL, () => resposta()));
}

function preencherEEnviar(username = 'a@b.com', password = '123456'): void {
  fireEvent.input(screen.getByLabelText(/e-mail/i), { target: { value: username } });
  fireEvent.input(screen.getByLabelText(/senha/i), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
}

describe('LoginComponent', () => {
  beforeEach(() => {
    // O contador de lockout do mock e estado de modulo; sem reset as falhas deste arquivo
    // acumulariam e um caso posterior receberia 423 sem pedir.
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
    const router = result.fixture.debugElement.injector.get(Router);
    let navigatedTo: string | null = null;
    router.navigateByUrl = (url: string) => {
      navigatedTo = url;
      return Promise.resolve(true);
    };

    preencherEEnviar('admin@empresa.com');

    await result.fixture.whenStable();
    await flush();

    expect(navigatedTo).toBe('/app/dashboard');
  });

  it('401: mostra erro de credencial', async () => {
    const result = await setup();
    preencherEEnviar('wrong@empresa.com', '999999');

    await result.fixture.whenStable();
    await flush();
    result.fixture.detectChanges();

    expect(screen.getByText(COPY_CREDENCIAL)).toBeTruthy();
  });

  it('423 com o errorInterceptor na cadeia: navega para /account-locked', async () => {
    stubLogin(() => new HttpResponse(null, { status: 423 }));
    const result = await setup({ comInterceptors: true });
    const router = result.fixture.debugElement.injector.get(Router);
    let navigatedTo: string | null = null;
    router.navigateByUrl = (url: string) => {
      navigatedTo = url;
      return Promise.resolve(true);
    };

    preencherEEnviar('admin@empresa.com');

    await result.fixture.whenStable();
    await flush();

    expect(navigatedTo).toBe('/account-locked');
  });

  it('423 sem interceptor: mensagem de bloqueio, provando que o mapeamento independe do redirect', async () => {
    stubLogin(() => new HttpResponse(null, { status: 423 }));
    const result = await setup();
    preencherEEnviar('admin@empresa.com');

    await result.fixture.whenStable();
    await flush();
    result.fixture.detectChanges();

    expect(screen.getByText(/conta bloqueada temporariamente/i)).toBeTruthy();
    expect(screen.getByText(/30 minutos/i)).toBeTruthy();
    expect(screen.queryByText(COPY_CREDENCIAL)).toBeNull();
  });

  it('429: orienta a aguardar e nao acusa senha invalida', async () => {
    stubLogin(() => new HttpResponse(null, { status: 429 }));
    const result = await setup();
    preencherEEnviar('admin@empresa.com');

    await result.fixture.whenStable();
    await flush();
    result.fixture.detectChanges();

    expect(screen.getByText(/muitas tentativas seguidas/i)).toBeTruthy();
    expect(screen.getByText(/1 minuto/i)).toBeTruthy();
    expect(screen.queryByText(COPY_CREDENCIAL)).toBeNull();
  });

  it('400: mensagem de dados invalidos', async () => {
    stubLogin(() => new HttpResponse(null, { status: 400 }));
    const result = await setup();
    preencherEEnviar('admin@empresa.com');

    await result.fixture.whenStable();
    await flush();
    result.fixture.detectChanges();

    expect(screen.getByText(/dados invalidos/i)).toBeTruthy();
    expect(screen.queryByText(COPY_CREDENCIAL)).toBeNull();
  });

  it('falha de rede: mensagem generica, nunca senha invalida', async () => {
    // `HttpResponse.error()` chega no Angular como status 0, o mesmo de CORS e offline.
    stubLogin(() => HttpResponse.error());
    const result = await setup();
    preencherEEnviar('admin@empresa.com');

    await result.fixture.whenStable();
    await flush();
    result.fixture.detectChanges();

    expect(screen.getByText(/verifique sua conexao/i)).toBeTruthy();
    expect(screen.queryByText(COPY_CREDENCIAL)).toBeNull();
  });
});
