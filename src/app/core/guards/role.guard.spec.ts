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

import { roleGuard } from './role.guard';
import { AuthService } from '../auth/auth.service';

function runGuard(roles: string[]): boolean | UrlTree {
  const route = { data: { roles } } as unknown as ActivatedRouteSnapshot;
  const state = { url: '/app/admin' } as RouterStateSnapshot;
  return TestBed.runInInjectionContext(() => roleGuard(route, state) as boolean | UrlTree);
}

describe('roleGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideRouter([])],
    });
  });

  it('sem roles exigidas: permite', () => {
    expect(runGuard([])).toBe(true);
  });

  it('sem currentUser e com roles exigidas: redireciona para /access-denied', () => {
    const router = TestBed.inject(Router);
    const result = runGuard(['ADMIN']);
    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/access-denied');
  });

  it('user ADMIN passa por rota admin', async () => {
    const auth = TestBed.inject(AuthService);
    await new Promise<void>((resolve, reject) => {
      auth.login({ username: 'admin@empresa.com', password: '123456' }).subscribe({
        next: () => resolve(),
        error: reject,
      });
    });
    expect(auth.currentUser()?.role).toBe('ADMIN');
    expect(runGuard(['ADMIN'])).toBe(true);
  });

  it('user ADMIN bloqueado em rota que exige CLIENTE', async () => {
    const auth = TestBed.inject(AuthService);
    await new Promise<void>((resolve, reject) => {
      auth.login({ username: 'admin@empresa.com', password: '123456' }).subscribe({
        next: () => resolve(),
        error: reject,
      });
    });
    const router = TestBed.inject(Router);
    const result = runGuard(['CLIENTE']);
    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/access-denied');
  });
});
