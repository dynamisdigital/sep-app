import { describe, expect, it, beforeEach } from 'vitest';
import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpRequest,
  HttpResponse,
  provideHttpClient,
} from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { errorInterceptor } from './error.interceptor';
import { AuthService } from '../auth/auth.service';

const ACCESS_TOKEN_KEY = 'SEP_ACCESS_TOKEN';

describe('errorInterceptor', () => {
  let navigatedTo: string | null;
  let router: Router;
  let auth: AuthService;

  beforeEach(() => {
    window.localStorage.clear();
    navigatedTo = null;
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideRouter([])],
    });
    router = TestBed.inject(Router);
    auth = TestBed.inject(AuthService);
    router.navigateByUrl = (url: string) => {
      navigatedTo = url;
      return Promise.resolve(true);
    };
  });

  function makeNext(error: HttpErrorResponse | null): HttpHandlerFn {
    return () => (error ? throwError(() => error) : of(new HttpResponse({ status: 200 })));
  }

  it('401 fora de /auth/login: limpa sessao e redireciona /login', () => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, 'expired-token');
    const req = new HttpRequest('GET', 'http://localhost:8080/api/v1/auth/me');
    const error = new HttpErrorResponse({ status: 401, url: req.url });

    TestBed.runInInjectionContext(() => {
      errorInterceptor(req, makeNext(error)).subscribe({
        next: () => undefined,
        error: () => undefined,
      });
    });

    expect(window.localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(auth.currentUser()).toBeNull();
    expect(navigatedTo).toBe('/login');
  });

  it('401 em /auth/login: nao limpa sessao nem navega', () => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, 'preserved');
    const req = new HttpRequest('POST', 'http://localhost:8080/api/v1/auth/login', {});
    const error = new HttpErrorResponse({ status: 401, url: req.url });

    TestBed.runInInjectionContext(() => {
      errorInterceptor(req, makeNext(error)).subscribe({
        next: () => undefined,
        error: () => undefined,
      });
    });

    expect(window.localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('preserved');
    expect(navigatedTo).toBeNull();
  });

  it('403: redireciona para /access-denied', () => {
    const req = new HttpRequest('GET', 'http://localhost:8080/api/v1/usuarios');
    const error = new HttpErrorResponse({ status: 403, url: req.url });

    TestBed.runInInjectionContext(() => {
      errorInterceptor(req, makeNext(error)).subscribe({
        next: () => undefined,
        error: () => undefined,
      });
    });

    expect(navigatedTo).toBe('/access-denied');
  });

  it('5xx inclui codigo de suporte quando traceId existe', () => {
    const req = new HttpRequest('GET', 'http://localhost:8080/api/v1/propostas');
    const error = new HttpErrorResponse({
      status: 500,
      url: req.url,
      error: {
        status: 500,
        message: 'Erro interno.',
        traceId: 'trace-abc',
      },
    });
    let propagated: HttpErrorResponse | null = null;

    TestBed.runInInjectionContext(() => {
      errorInterceptor(req, makeNext(error)).subscribe({
        next: () => undefined,
        error: (err: HttpErrorResponse) => {
          propagated = err;
        },
      });
    });

    expect(propagated?.error.message).toBe('Erro interno. Código de suporte: trace-abc.');
    expect(navigatedTo).toBeNull();
  });

  it('4xx preserva mensagem sem codigo de suporte', () => {
    const req = new HttpRequest('POST', 'http://localhost:8080/api/v1/propostas', {});
    const error = new HttpErrorResponse({
      status: 422,
      url: req.url,
      error: {
        status: 422,
        message: 'Proposta invalida.',
        traceId: 'trace-abc',
      },
    });
    let propagated: HttpErrorResponse | null = null;

    TestBed.runInInjectionContext(() => {
      errorInterceptor(req, makeNext(error)).subscribe({
        next: () => undefined,
        error: (err: HttpErrorResponse) => {
          propagated = err;
        },
      });
    });

    expect(propagated?.error.message).toBe('Proposta invalida.');
  });
});
