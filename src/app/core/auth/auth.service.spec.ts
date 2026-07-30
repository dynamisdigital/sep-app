import { describe, expect, it, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AuthService } from './auth.service';
import { resetLoginLockoutState } from '../../../mocks/handlers';

const ACCESS_TOKEN_KEY = 'SEP_ACCESS_TOKEN';

function awaitObservable<T>(obs: Observable<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    obs.subscribe({ next: resolve, error: reject });
  });
}

/** Status HTTP de um login que deve falhar. Rejeita se o login der 2xx. */
function statusDoLogin(service: AuthService, username: string, password: string): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    service.login({ username, password }).subscribe({
      next: () => reject(new Error(`login de ${username} deveria ter falhado`)),
      error: (erro: HttpErrorResponse) => resolve(erro.status),
    });
  });
}

describe('AuthService', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // O contador de falhas do mock e estado de modulo e o Vitest isola modulos por arquivo, nao
    // por teste: sem este reset as falhas de um teste vazam para os seguintes e um caso nao
    // relacionado acaba recebendo 423.
    resetLoginLockoutState();
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
  });

  it('login grava token e currentUser', async () => {
    const service = TestBed.inject(AuthService);

    const response = await awaitObservable(
      service.login({ username: 'admin@empresa.com', password: '123456' }),
    );

    expect(response.accessToken).toBe('mock-jwt-token');
    expect(window.localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('mock-jwt-token');
    expect(service.currentUser()?.username).toBe('admin@empresa.com');
    expect(service.hasToken()).toBe(true);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('login invalido nao seta currentUser', async () => {
    const service = TestBed.inject(AuthService);

    await new Promise<void>((resolve) => {
      service.login({ username: 'wrong@empresa.com', password: '999999' }).subscribe({
        next: () => resolve(),
        error: () => resolve(),
      });
    });

    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(window.localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
  });

  it('lockout: 5 falhas devolvem 401 e a 6a devolve 423 mesmo com a senha correta', async () => {
    const service = TestBed.inject(AuthService);

    for (let tentativa = 1; tentativa <= 5; tentativa += 1) {
      const status = await statusDoLogin(service, 'admin@empresa.com', 'senha-errada');
      expect(status, `tentativa ${tentativa}`).toBe(401);
    }

    // A 6a usa a senha CORRETA de proposito: o backend verifica o lockout antes de avaliar a
    // credencial (AutenticarUsuarioUseCase#executar), entao a conta trancada nao destranca ao
    // acertar a senha. Verificado contra :8080 em 2026-07-30.
    expect(await statusDoLogin(service, 'admin@empresa.com', '123456')).toBe(423);
  });

  it('lockout: contador e por usuario, nao global', async () => {
    const service = TestBed.inject(AuthService);

    for (let tentativa = 1; tentativa <= 5; tentativa += 1) {
      await statusDoLogin(service, 'admin@empresa.com', 'senha-errada');
    }

    // Outro usuario nao herda o bloqueio: segue em 401, nao 423. Deliberadamente uma falha, nao um
    // login valido — um login bem-sucedido mutaria `currentMockUser` no mock e vazaria para as
    // specs de /auth/me deste arquivo.
    expect(await statusDoLogin(service, 'financeiro@empresa.com', 'senha-errada')).toBe(401);
  });

  it('loadCurrentUser popula usuario via /auth/me', async () => {
    const service = TestBed.inject(AuthService);
    window.localStorage.setItem(ACCESS_TOKEN_KEY, 'mock-jwt-token');

    const usuario = await awaitObservable(service.loadCurrentUser());

    expect(usuario.username).toBe('admin@empresa.com');
    expect(service.currentUser()?.username).toBe('admin@empresa.com');
    expect(service.loadingUser()).toBe(false);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('register envia payload e retorna usuario', async () => {
    const service = TestBed.inject(AuthService);

    const usuario = await awaitObservable(
      service.register({ username: 'novo@empresa.com', password: '123456', role: 'CLIENTE' }),
    );

    expect(usuario.username).toBe('novo@empresa.com');
  });

  it('clearSession limpa token e currentUser', async () => {
    const service = TestBed.inject(AuthService);
    await awaitObservable(service.login({ username: 'admin@empresa.com', password: '123456' }));

    service.clearSession();

    expect(window.localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.hasToken()).toBe(false);
  });

  it('logout delega para clearSession', async () => {
    const service = TestBed.inject(AuthService);
    await awaitObservable(service.login({ username: 'admin@empresa.com', password: '123456' }));

    await awaitObservable(service.logout());

    expect(window.localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(service.currentUser()).toBeNull();
  });
});
