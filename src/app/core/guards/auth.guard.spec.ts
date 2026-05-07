import { describe, expect, it, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { authGuard } from './auth.guard';
import { AuthService } from '../auth/auth.service';

const ACCESS_TOKEN_KEY = 'SEP_ACCESS_TOKEN';

function runGuard(): boolean | UrlTree | Promise<boolean | UrlTree> {
  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/app' } as RouterStateSnapshot;
  return TestBed.runInInjectionContext(() => {
    const result = authGuard(route, state);
    if (result instanceof UrlTree || typeof result === 'boolean') {
      return result;
    }
    return new Promise<boolean | UrlTree>((resolve, reject) => {
      (
        result as {
          subscribe: (h: {
            next: (v: boolean | UrlTree) => void;
            error: (e: unknown) => void;
          }) => void;
        }
      ).subscribe({ next: resolve, error: reject });
    });
  });
}

describe('authGuard', () => {
  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideRouter([])],
    });
  });

  it('sem token: retorna UrlTree para /login', async () => {
    const router = TestBed.inject(Router);
    const result = await runGuard();
    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
  });

  it('com token + currentUser: permite', async () => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, 'token');
    const auth = TestBed.inject(AuthService);
    await new Promise<void>((resolve, reject) => {
      auth.login({ username: 'admin@empresa.com', password: '123456' }).subscribe({
        next: () => resolve(),
        error: reject,
      });
    });

    const result = await runGuard();
    expect(result).toBe(true);
  });

  it('com token sem currentUser: chama /auth/me e permite', async () => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, 'token');
    const auth = TestBed.inject(AuthService);
    expect(auth.currentUser()).toBeNull();

    const result = await runGuard();
    expect(result).toBe(true);
    expect(auth.currentUser()?.username).toBe('admin@empresa.com');
  });
});
