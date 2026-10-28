import { describe, expect, it, beforeEach } from 'vitest';
import {
  HttpContext,
  HttpErrorResponse,
  HttpHandlerFn,
  HttpRequest,
  HttpResponse,
  provideHttpClient,
} from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { TRATA_403_LOCALMENTE, errorInterceptor } from './error.interceptor';
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

  /**
   * Semeia o usuario corrente no estado privado do AuthService. Sem isto, `currentUser()` ja nasce
   * nulo e um assert de "limpou a sessao" passaria mesmo com o `clearSession()` removido.
   */
  function semearUsuario(): void {
    (auth as unknown as { currentUserState: { set: (u: unknown) => void } }).currentUserState.set({
      id: 'u-1',
      username: 'admin@empresa.com',
    });
  }

  it('401 fora de /auth/login: limpa sessao e redireciona /login', () => {
    // Sem semear, `currentUser()` ja nasce nulo e o assert correspondente passaria mesmo com o
    // `currentUserState.set(null)` fora do clearSession — decorativo, provado por mutacao.
    semearUsuario();
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

  it('401 em /auth/politica-lockout: nao navega — a /account-locked sobrevive a consulta', () => {
    // Reproduz o defeito que a F-23 nomeou e nao fechou. Isentar a rota no `authInterceptor` impede
    // o header de ser ENVIADO, nao a resposta de ser TRATADA: o `errorInterceptor` e o ultimo da
    // cadeia, logo o mais interno, e ve o erro antes do `catchError` do PoliticaLockoutService.
    // Basta um web novo contra backend sem a Sprint 34 — a rota nao existe e o Spring responde 401.
    window.localStorage.setItem(ACCESS_TOKEN_KEY, 'stale-token');
    semearUsuario();
    const req = new HttpRequest('GET', 'http://localhost:8080/api/v1/auth/politica-lockout');
    const error = new HttpErrorResponse({ status: 401, url: req.url });
    let propagado: HttpErrorResponse | null = null;

    TestBed.runInInjectionContext(() => {
      errorInterceptor(req, makeNext(error)).subscribe({
        next: () => undefined,
        error: (err: HttpErrorResponse) => {
          propagado = err;
        },
      });
    });

    expect(navigatedTo).toBeNull();
    expect(window.localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('stale-token');
    expect(auth.currentUser()).not.toBeNull();
    // Isentar da NAVEGACAO nao pode virar engolir o erro: o servico precisa do 401 para cair no
    // proprio `catchError` e a pagina renderizar o fallback.
    expect((propagado as HttpErrorResponse | null)?.status).toBe(401);
  });

  it('403 em /auth/politica-lockout: nao navega para /access-denied', () => {
    // Mesmo vetor do 401 acima: contra um backend sem a rota, o status depende da config de
    // seguranca, entao os dois precisam da isencao. Cobrir so o 401 deixaria metade do buraco.
    const req = new HttpRequest('GET', 'http://localhost:8080/api/v1/auth/politica-lockout');
    const error = new HttpErrorResponse({ status: 403, url: req.url });
    let propagado: HttpErrorResponse | null = null;

    TestBed.runInInjectionContext(() => {
      errorInterceptor(req, makeNext(error)).subscribe({
        next: () => undefined,
        error: (err: HttpErrorResponse) => {
          propagado = err;
        },
      });
    });

    expect(navigatedTo).toBeNull();
    // Simetrico ao teste do 401: isentar da NAVEGACAO nao pode virar engolir o erro.
    expect((propagado as HttpErrorResponse | null)?.status).toBe(403);
  });

  it('401 em /auth/refresh: publico no backend, mas a sessao morreu — navega para /login', () => {
    // Trava a metade que sustenta o desenho: a lista NAO e a dos `permitAll`. `/auth/refresh` e
    // `permitAll` no SecurityConfig e mesmo assim fica de fora, porque um 401 ali significa sessao
    // morta e PRECISA navegar. Sem este teste, alguem que conclua "a lista deveria ser a dos
    // permitAll" acrescenta uma linha e o refresh morto para de redirecionar, em silencio.
    semearUsuario();
    window.localStorage.setItem(ACCESS_TOKEN_KEY, 'dead-token');
    const req = new HttpRequest('POST', 'http://localhost:8080/api/v1/auth/refresh', {});
    const error = new HttpErrorResponse({ status: 401, url: req.url });

    TestBed.runInInjectionContext(() => {
      errorInterceptor(req, makeNext(error)).subscribe({
        next: () => undefined,
        error: () => undefined,
      });
    });

    expect(navigatedTo).toBe('/login');
    expect(window.localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
  });

  it('423 em /auth/login: limpa sessao e redireciona /account-locked', () => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, 'stale-token');
    semearUsuario();
    const req = new HttpRequest('POST', 'http://localhost:8080/api/v1/auth/login', {});
    const error = new HttpErrorResponse({ status: 423, url: req.url });

    TestBed.runInInjectionContext(() => {
      errorInterceptor(req, makeNext(error)).subscribe({
        next: () => undefined,
        error: () => undefined,
      });
    });

    // O 423 NAO consulta `ehRotaPublica`, ao contrario do 401/403: conta bloqueada e estado global,
    // e `/auth/login` — que E rota publica — e justamente de onde o usuario chega ate ele. Este
    // assert e o que trava a assimetria: estender a isencao ao 423 mata a unica navegacao que abre
    // a /account-locked.
    expect(window.localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(auth.currentUser()).toBeNull();
    expect(navigatedTo).toBe('/account-locked');
  });

  it('429: nao limpa sessao nem navega — rate limit nao e conta bloqueada', () => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, 'preserved');
    semearUsuario();
    const req = new HttpRequest('POST', 'http://localhost:8080/api/v1/auth/login', {});
    const error = new HttpErrorResponse({ status: 429, url: req.url });

    TestBed.runInInjectionContext(() => {
      errorInterceptor(req, makeNext(error)).subscribe({
        next: () => undefined,
        error: () => undefined,
      });
    });

    // O 429 vem do RateLimitFilter, por IP: nenhuma conta esta trancada. Mandar o usuario para
    // /account-locked e apagar a sessao dele seria informar um bloqueio que nao existe.
    expect(window.localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('preserved');
    expect(auth.currentUser()).not.toBeNull();
    expect(navigatedTo).toBeNull();
  });

  it('423: propaga o erro apos o redirect, para a tela renderizar o fallback', () => {
    const req = new HttpRequest('POST', 'http://localhost:8080/api/v1/auth/login', {});
    const error = new HttpErrorResponse({ status: 423, url: req.url });
    let propagado: HttpErrorResponse | null = null;

    TestBed.runInInjectionContext(() => {
      errorInterceptor(req, makeNext(error)).subscribe({
        next: () => undefined,
        error: (err: HttpErrorResponse) => {
          propagado = err;
        },
      });
    });

    expect((propagado as HttpErrorResponse | null)?.status).toBe(423);
    expect(navigatedTo).toBe('/account-locked');
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

  it('403 com TRATA_403_LOCALMENTE: nao navega e propaga o erro para a tela', () => {
    const req = new HttpRequest(
      'GET',
      'http://localhost:8080/api/v1/cobranca/parcelas/abc/renegociacao-ativa',
      { context: new HttpContext().set(TRATA_403_LOCALMENTE, true) },
    );
    const error = new HttpErrorResponse({ status: 403, url: req.url });
    let propagado: unknown = null;

    TestBed.runInInjectionContext(() => {
      errorInterceptor(req, makeNext(error)).subscribe({
        next: () => undefined,
        error: (err: unknown) => {
          propagado = err;
        },
      });
    });

    expect(navigatedTo).toBeNull();
    expect((propagado as HttpErrorResponse).status).toBe(403);
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
