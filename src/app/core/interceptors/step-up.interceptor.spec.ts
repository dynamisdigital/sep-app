import { HttpHandlerFn, HttpRequest, HttpResponse, provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { StepUpTokenStore } from '../auth/step-up-token.store';
import { stepUpInterceptor } from './step-up.interceptor';

describe('stepUpInterceptor', () => {
  let store: StepUpTokenStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    store = TestBed.inject(StepUpTokenStore);
  });

  function captureNext() {
    const state: { lastReq: HttpRequest<unknown> | null } = { lastReq: null };
    const handler: HttpHandlerFn = (req) => {
      state.lastReq = req;
      return of(new HttpResponse({ status: 200 }));
    };
    return { state, handler };
  }

  it('anexa X-Step-Up-Token no aceite de contrato e consome o token', () => {
    store.set('step-up-tok');
    const req = new HttpRequest('PATCH', 'http://localhost:8080/api/v1/contratos/abc/aceite', {});
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      stepUpInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.get('X-Step-Up-Token')).toBe('step-up-tok');
    expect(store.token()).toBeNull();
  });

  it('nao anexa o token num GET para URL terminada em /aceite (guard de metodo)', () => {
    store.set('step-up-tok');
    const req = new HttpRequest('GET', 'http://localhost:8080/api/v1/contratos/abc/aceite');
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      stepUpInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.has('X-Step-Up-Token')).toBe(false);
    expect(store.token()).toBe('step-up-tok');
  });

  it('nao anexa o token em requests fora da whitelist', () => {
    store.set('step-up-tok');
    const req = new HttpRequest('GET', 'http://localhost:8080/api/v1/contratos/abc');
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      stepUpInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.has('X-Step-Up-Token')).toBe(false);
    expect(store.token()).toBe('step-up-tok');
  });

  it('anexa o token ao propor renegociacao (POST /cobranca/parcelas/:id/renegociacao)', () => {
    store.set('step-up-tok');
    const req = new HttpRequest(
      'POST',
      'http://localhost:8080/api/v1/cobranca/parcelas/abc/renegociacao',
      {},
    );
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      stepUpInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.get('X-Step-Up-Token')).toBe('step-up-tok');
    expect(store.token()).toBeNull();
  });

  it('anexa o token no aceite de renegociacao (PATCH /cobranca/renegociacoes/:id/aceite)', () => {
    store.set('step-up-tok');
    const req = new HttpRequest(
      'PATCH',
      'http://localhost:8080/api/v1/cobranca/renegociacoes/abc/aceite',
      {},
    );
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      stepUpInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.get('X-Step-Up-Token')).toBe('step-up-tok');
    expect(store.token()).toBeNull();
  });

  it('NAO anexa o token na recusa de renegociacao (sem step-up no backend)', () => {
    store.set('step-up-tok');
    const req = new HttpRequest(
      'PATCH',
      'http://localhost:8080/api/v1/cobranca/renegociacoes/abc/recusa',
      {},
    );
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      stepUpInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.has('X-Step-Up-Token')).toBe(false);
    expect(store.token()).toBe('step-up-tok');
  });
});
