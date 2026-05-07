import { describe, expect, it, beforeEach } from 'vitest';
import { HttpHandlerFn, HttpRequest, HttpResponse, provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { authInterceptor } from './auth.interceptor';

const ACCESS_TOKEN_KEY = 'SEP_ACCESS_TOKEN';

describe('authInterceptor', () => {
  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
  });

  function captureNext() {
    const state: { lastReq: HttpRequest<unknown> | null } = { lastReq: null };
    const handler: HttpHandlerFn = (req) => {
      state.lastReq = req;
      return of(new HttpResponse({ status: 200 }));
    };
    return { state, handler };
  }

  it('anexa Authorization quando ha token e nao eh login', () => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, 'abc-token');
    const req = new HttpRequest('GET', 'http://localhost:8080/api/v1/auth/me');
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      authInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.get('Authorization')).toBe('Bearer abc-token');
  });

  it('nao anexa Authorization para /auth/login', () => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, 'abc-token');
    const req = new HttpRequest('POST', 'http://localhost:8080/api/v1/auth/login', {});
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      authInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.has('Authorization')).toBe(false);
  });

  it('nao anexa Authorization quando nao ha token', () => {
    const req = new HttpRequest('GET', 'http://localhost:8080/api/v1/auth/me');
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      authInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.has('Authorization')).toBe(false);
  });
});
