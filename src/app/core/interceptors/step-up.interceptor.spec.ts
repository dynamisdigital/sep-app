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

  it('NAO anexa o token na consulta de renegociacao ativa do tomador (GET, F-16)', () => {
    store.set('step-up-tok');
    const req = new HttpRequest(
      'GET',
      'http://localhost:8080/api/v1/cobranca/parcelas/abc/renegociacao-ativa',
    );
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      stepUpInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.has('X-Step-Up-Token')).toBe(false);
    expect(store.token()).toBe('step-up-tok');
  });

  it('sem token no store, o PATCH de aceite segue sem header (backend decide o 403)', () => {
    const req = new HttpRequest(
      'PATCH',
      'http://localhost:8080/api/v1/cobranca/renegociacoes/abc/aceite',
      {},
    );
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      stepUpInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.has('X-Step-Up-Token')).toBe(false);
    expect(store.token()).toBeNull();
  });

  it('anexa o token ao resolver item da fila (PATCH /backoffice/fila/:id/resolver)', () => {
    store.set('step-up-tok');
    const req = new HttpRequest(
      'PATCH',
      'http://localhost:8080/api/v1/backoffice/fila/abc/resolver',
      {},
    );
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      stepUpInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.get('X-Step-Up-Token')).toBe('step-up-tok');
    expect(store.token()).toBeNull();
  });

  it('anexa o token ao ignorar item da fila (PATCH /backoffice/fila/:id/ignorar)', () => {
    store.set('step-up-tok');
    const req = new HttpRequest(
      'PATCH',
      'http://localhost:8080/api/v1/backoffice/fila/abc/ignorar',
      {},
    );
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      stepUpInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.get('X-Step-Up-Token')).toBe('step-up-tok');
    expect(store.token()).toBeNull();
  });

  it('NAO anexa o token no comentario da fila (sem step-up no backend)', () => {
    store.set('step-up-tok');
    const req = new HttpRequest(
      'POST',
      'http://localhost:8080/api/v1/backoffice/fila/abc/comentarios',
      {},
    );
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      stepUpInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.has('X-Step-Up-Token')).toBe(false);
    expect(store.token()).toBe('step-up-tok');
  });

  it('anexa o token ao reprocessar webhook (POST /backoffice/reprocessos/webhook/:id)', () => {
    store.set('step-up-tok');
    const req = new HttpRequest(
      'POST',
      'http://localhost:8080/api/v1/backoffice/reprocessos/webhook/abc',
      {},
    );
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      stepUpInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.get('X-Step-Up-Token')).toBe('step-up-tok');
    expect(store.token()).toBeNull();
  });

  it('anexa o token ao reprocessar provider (POST /backoffice/reprocessos/provider/...)', () => {
    store.set('step-up-tok');
    const req = new HttpRequest(
      'POST',
      'http://localhost:8080/api/v1/backoffice/reprocessos/provider/PIX_TRANSFERENCIA/abc',
      {},
    );
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      stepUpInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.get('X-Step-Up-Token')).toBe('step-up-tok');
    expect(store.token()).toBeNull();
  });

  it('anexa o token ao substituir roles (PUT /usuarios/:id/roles)', () => {
    store.set('step-up-tok');
    const req = new HttpRequest('PUT', 'http://localhost:8080/api/v1/usuarios/abc/roles', {});
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      stepUpInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.get('X-Step-Up-Token')).toBe('step-up-tok');
    expect(store.token()).toBeNull();
  });

  it('anexa o token ao adicionar role (POST /usuarios/:id/roles/:role)', () => {
    store.set('step-up-tok');
    const req = new HttpRequest(
      'POST',
      'http://localhost:8080/api/v1/usuarios/abc/roles/FINANCEIRO',
      null,
    );
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      stepUpInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.get('X-Step-Up-Token')).toBe('step-up-tok');
    expect(store.token()).toBeNull();
  });

  it('anexa o token ao remover role (DELETE /usuarios/:id/roles/:role)', () => {
    store.set('step-up-tok');
    const req = new HttpRequest(
      'DELETE',
      'http://localhost:8080/api/v1/usuarios/abc/roles/BACKOFFICE',
    );
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      stepUpInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.get('X-Step-Up-Token')).toBe('step-up-tok');
    expect(store.token()).toBeNull();
  });

  it('NAO anexa o token na leitura de roles (GET /usuarios/:id/roles)', () => {
    store.set('step-up-tok');
    const req = new HttpRequest('GET', 'http://localhost:8080/api/v1/usuarios/abc/roles');
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      stepUpInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.has('X-Step-Up-Token')).toBe(false);
    expect(store.token()).toBe('step-up-tok');
  });

  it('anexa o token ao alterar parametro (PATCH /governanca/parametros/:chave)', () => {
    store.set('step-up-tok');
    const req = new HttpRequest(
      'PATCH',
      'http://localhost:8080/api/v1/governanca/parametros/credito.valor.maximo.pf',
      {},
    );
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      stepUpInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.get('X-Step-Up-Token')).toBe('step-up-tok');
    expect(store.token()).toBeNull();
  });

  it('NAO anexa o token na leitura de parametros (GET /governanca/parametros e detalhe)', () => {
    store.set('step-up-tok');
    const lista = new HttpRequest('GET', 'http://localhost:8080/api/v1/governanca/parametros');
    const detalhe = new HttpRequest(
      'GET',
      'http://localhost:8080/api/v1/governanca/parametros/credito.valor.maximo.pf',
    );
    const listaCap = captureNext();
    const detalheCap = captureNext();

    TestBed.runInInjectionContext(() => {
      stepUpInterceptor(lista, listaCap.handler).subscribe();
      stepUpInterceptor(detalhe, detalheCap.handler).subscribe();
    });

    expect(listaCap.state.lastReq?.headers.has('X-Step-Up-Token')).toBe(false);
    expect(detalheCap.state.lastReq?.headers.has('X-Step-Up-Token')).toBe(false);
    expect(store.token()).toBe('step-up-tok');
  });

  it('anexa o token ao solicitar desembolso Pix (POST /pix/desembolsos)', () => {
    store.set('step-up-tok');
    const req = new HttpRequest('POST', 'http://localhost:8080/api/v1/pix/desembolsos', {});
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      stepUpInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.get('X-Step-Up-Token')).toBe('step-up-tok');
    expect(store.token()).toBeNull();
  });

  it('anexa o token ao reconciliar status do desembolso (POST /pix/desembolsos/:id/status)', () => {
    store.set('step-up-tok');
    const req = new HttpRequest(
      'POST',
      'http://localhost:8080/api/v1/pix/desembolsos/abc/status',
      null,
    );
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      stepUpInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.get('X-Step-Up-Token')).toBe('step-up-tok');
    expect(store.token()).toBeNull();
  });

  it('NAO anexa o token na leitura local do desembolso (GET /pix/desembolsos/:id)', () => {
    store.set('step-up-tok');
    const req = new HttpRequest('GET', 'http://localhost:8080/api/v1/pix/desembolsos/abc');
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      stepUpInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.has('X-Step-Up-Token')).toBe(false);
    expect(store.token()).toBe('step-up-tok');
  });

  it('NAO anexa o token ao gerar referencia Pix (POST /pix/recebimentos/referencias, sem step-up)', () => {
    store.set('step-up-tok');
    const req = new HttpRequest(
      'POST',
      'http://localhost:8080/api/v1/pix/recebimentos/referencias',
      {},
    );
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      stepUpInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.has('X-Step-Up-Token')).toBe(false);
    expect(store.token()).toBe('step-up-tok');
  });

  it('anexa o token ao decidir matching (POST /credores/matching/:id/decisao)', () => {
    store.set('step-up-tok');
    const req = new HttpRequest(
      'POST',
      'http://localhost:8080/api/v1/credores/matching/abc/decisao',
      {},
    );
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      stepUpInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.get('X-Step-Up-Token')).toBe('step-up-tok');
    expect(store.token()).toBeNull();
  });

  it('anexa o token ao registrar aporte (POST /credores/operacoes/:id/aportes)', () => {
    store.set('step-up-tok');
    const req = new HttpRequest(
      'POST',
      'http://localhost:8080/api/v1/credores/operacoes/abc/aportes',
      {},
    );
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      stepUpInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.get('X-Step-Up-Token')).toBe('step-up-tok');
    expect(store.token()).toBeNull();
  });

  it('NAO anexa o token na lista owner-scoped de aportes (GET mesma URL do POST)', () => {
    store.set('step-up-tok');
    const req = new HttpRequest(
      'GET',
      'http://localhost:8080/api/v1/credores/operacoes/abc/aportes',
    );
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      stepUpInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.has('X-Step-Up-Token')).toBe(false);
    expect(store.token()).toBe('step-up-tok');
  });

  it('NAO anexa o token nas leituras de matching (GET sugestoes e detalhe)', () => {
    store.set('step-up-tok');
    const sugestoes = new HttpRequest(
      'GET',
      'http://localhost:8080/api/v1/credores/matching/sugestoes',
    );
    const detalhe = new HttpRequest('GET', 'http://localhost:8080/api/v1/credores/matching/abc');
    const sugestoesCap = captureNext();
    const detalheCap = captureNext();

    TestBed.runInInjectionContext(() => {
      stepUpInterceptor(sugestoes, sugestoesCap.handler).subscribe();
      stepUpInterceptor(detalhe, detalheCap.handler).subscribe();
    });

    expect(sugestoesCap.state.lastReq?.headers.has('X-Step-Up-Token')).toBe(false);
    expect(detalheCap.state.lastReq?.headers.has('X-Step-Up-Token')).toBe(false);
    expect(store.token()).toBe('step-up-tok');
  });

  it('NAO anexa o token no interesse da credora (POST /oportunidades/:id/interesses, path parecido)', () => {
    store.set('step-up-tok');
    const req = new HttpRequest(
      'POST',
      'http://localhost:8080/api/v1/credores/oportunidades/abc/interesses',
      null,
    );
    const { state, handler } = captureNext();

    TestBed.runInInjectionContext(() => {
      stepUpInterceptor(req, handler).subscribe();
    });

    expect(state.lastReq?.headers.has('X-Step-Up-Token')).toBe(false);
    expect(store.token()).toBe('step-up-tok');
  });
});
