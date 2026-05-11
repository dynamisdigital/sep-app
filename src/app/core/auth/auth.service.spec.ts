import { describe, expect, it, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AuthService } from './auth.service';

const ACCESS_TOKEN_KEY = 'SEP_ACCESS_TOKEN';

function awaitObservable<T>(obs: Observable<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    obs.subscribe({ next: resolve, error: reject });
  });
}

describe('AuthService', () => {
  beforeEach(() => {
    window.localStorage.clear();
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
