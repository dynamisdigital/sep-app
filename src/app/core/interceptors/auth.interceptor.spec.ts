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

  it('nao anexa Authorization para /auth/politica-lockout, mesmo com token no storage', () => {
    // O endpoint e publico e serve a /account-locked, que e alcancavel por URL direta e por reload
    // — caminhos em que o token velho ainda esta no storage. Se ele viajar, o backend responde 401
    // e o errorInterceptor tira o usuario da pagina.
    window.localStorage.setItem(ACCESS_TOKEN_KEY, 'abc-token');
    const req = new HttpRequest('GET', 'http://localhost:8080/api/v1/auth/politica-lockout');
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      authInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.has('Authorization')).toBe(false);
  });

  it('anexa Authorization em rota que apenas CONTEM /auth/login no caminho', () => {
    // A lista casa o fim do pathname, nao um `includes` na URL crua. `/auth/login` e um prefixo
    // propenso a colisao — o backend ja tem a tabela `login_attempt`, entao um
    // `/auth/login-attempts` e plausivel. Com `includes`, ele seria tratado como publico e perderia
    // de uma vez o header e o redirect de 401/403, sem ninguem notar.
    window.localStorage.setItem(ACCESS_TOKEN_KEY, 'abc-token');
    const req = new HttpRequest('GET', 'http://localhost:8080/api/v1/auth/login-attempts');
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      authInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.get('Authorization')).toBe('Bearer abc-token');
  });

  it('nao anexa Authorization para /auth/login com query string', () => {
    // O pathname descarta a query, entao a rota publica continua reconhecida — e, na direcao
    // oposta, nenhum parametro consegue simular uma.
    window.localStorage.setItem(ACCESS_TOKEN_KEY, 'abc-token');
    const req = new HttpRequest(
      'POST',
      'http://localhost:8080/api/v1/auth/login?redirect=/app',
      {},
    );
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
