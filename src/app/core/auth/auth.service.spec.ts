import { describe, expect, it, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { AuthService } from './auth.service';

const ACCESS_TOKEN_KEY = 'SEP_ACCESS_TOKEN';

describe('AuthService', () => {
  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
  });

  it('login grava token e currentUser', async () => {
    const service = TestBed.inject(AuthService);

    const response = await new Promise<{ accessToken: string }>((resolve, reject) => {
      service
        .login({ username: 'admin@empresa.com', password: '123456' })
        .subscribe({ next: resolve, error: reject });
    });

    expect(response.accessToken).toBe('mock-jwt-token');
    expect(window.localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('mock-jwt-token');
    expect(service.currentUser()?.username).toBe('admin@empresa.com');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('login com credenciais invalidas nao seta currentUser', async () => {
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

  it('register envia payload e retorna usuario', async () => {
    const service = TestBed.inject(AuthService);

    const usuario = await new Promise<{ username: string }>((resolve, reject) => {
      service
        .register({ username: 'novo@empresa.com', password: '123456', role: 'CLIENTE' })
        .subscribe({ next: resolve, error: reject });
    });

    expect(usuario.username).toBe('novo@empresa.com');
  });

  it('logout limpa token e currentUser', async () => {
    const service = TestBed.inject(AuthService);
    await new Promise<void>((resolve, reject) => {
      service.login({ username: 'admin@empresa.com', password: '123456' }).subscribe({
        next: () => resolve(),
        error: reject,
      });
    });

    service.logout();

    expect(window.localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });
});
