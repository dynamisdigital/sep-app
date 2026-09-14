import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { UsuarioResponse } from '../api/api.models';
import { AuthService } from '../auth/auth.service';
import { NotificacoesNaoLidasStore } from './notificacoes-nao-lidas.store';

const CONTAGEM_URL = 'http://localhost:8080/api/v1/notificacoes/nao-lidas/contagem';

function usuario(id: string, username: string): UsuarioResponse {
  return {
    id,
    username,
    role: 'CLIENTE',
    precisaRedefinirSenha: false,
    mfaHabilitado: false,
    dataCriacao: '2026-09-14T10:00:00-03:00',
    dataModificacao: '2026-09-14T10:00:00-03:00',
    criadoPor: 'system',
    modificadoPor: 'system',
  };
}

const USUARIO_A = usuario('1f0799c0-98b9-6d9d-bc4a-7d6f5b77a001', 'a@empresa.com');
const USUARIO_B = usuario('1f0799c0-98b9-6d9d-bc4a-7d6f5b77b001', 'b@empresa.com');

// Estado compartilhado do contador entre o header e a central. O que ele promete: uma fonte so,
// sem consulta duplicada na abertura, sem timer, e nunca mostrar a contagem de outra sessao.
describe('NotificacoesNaoLidasStore', () => {
  let store: NotificacoesNaoLidasStore;
  let auth: AuthService;
  let httpMock: HttpTestingController;

  function entrarComo(u: UsuarioResponse): void {
    auth.applyMfaVerifyResponse({
      accessToken: `token-${u.id}`,
      tokenType: 'Bearer',
      expiresIn: 3600,
      refreshToken: null,
      usuario: u,
      mfaRequired: false,
      mfaChallengeId: null,
    });
  }

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(NotificacoesNaoLidasStore);
    auth = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    window.localStorage.clear();
  });

  it('sem sessao nao consulta nem expoe contagem', () => {
    store.carregar();

    httpMock.expectNone(CONTAGEM_URL);
    expect(store.contagem()).toBeNull();
  });

  it('fica carregando ate a resposta e entao expoe o numero do servidor', () => {
    entrarComo(USUARIO_A);
    store.carregar();

    expect(store.contagem()).toEqual({ situacao: 'carregando' });
    httpMock.expectOne(CONTAGEM_URL).flush({ naoLidas: 2 });

    expect(store.contagem()).toEqual({ situacao: 'conhecida', naoLidas: 2 });
  });

  it('zero e contagem conhecida, nao ausencia', () => {
    entrarComo(USUARIO_A);
    store.carregar();
    httpMock.expectOne(CONTAGEM_URL).flush({ naoLidas: 0 });

    expect(store.contagem()).toEqual({ situacao: 'conhecida', naoLidas: 0 });
  });

  it('falha sem valor conhecido vira indisponivel, nunca zero', () => {
    entrarComo(USUARIO_A);
    store.carregar();
    httpMock
      .expectOne(CONTAGEM_URL)
      .flush({ message: 'erro' }, { status: 500, statusText: 'Server Error' });

    expect(store.contagem()).toEqual({ situacao: 'indisponivel' });
  });

  it('header e central pedindo na mesma abertura geram uma consulta so', () => {
    entrarComo(USUARIO_A);
    store.carregar();
    store.carregar();

    httpMock.expectOne(CONTAGEM_URL).flush({ naoLidas: 1 });
    expect(store.contagem()).toEqual({ situacao: 'conhecida', naoLidas: 1 });
  });

  it('pedir de novo depois de concluida reconsulta e mantem o valor ate a resposta', () => {
    entrarComo(USUARIO_A);
    store.carregar();
    httpMock.expectOne(CONTAGEM_URL).flush({ naoLidas: 3 });

    store.carregar();
    expect(store.contagem()).toEqual({ situacao: 'conhecida', naoLidas: 3 });
    httpMock.expectOne(CONTAGEM_URL).flush({ naoLidas: 1 });

    expect(store.contagem()).toEqual({ situacao: 'conhecida', naoLidas: 1 });
  });

  it('reconsulta que falha nao apaga o valor ja conhecido', () => {
    entrarComo(USUARIO_A);
    store.carregar();
    httpMock.expectOne(CONTAGEM_URL).flush({ naoLidas: 3 });

    store.carregar();
    httpMock
      .expectOne(CONTAGEM_URL)
      .flush({ message: 'erro' }, { status: 503, statusText: 'Unavailable' });

    expect(store.contagem()).toEqual({ situacao: 'conhecida', naoLidas: 3 });
  });

  it('logout esconde a contagem da sessao encerrada', () => {
    entrarComo(USUARIO_A);
    store.carregar();
    httpMock.expectOne(CONTAGEM_URL).flush({ naoLidas: 4 });

    auth.clearSession();

    expect(store.contagem()).toBeNull();
  });

  it('resposta tardia da sessao A nao aparece para B', () => {
    entrarComo(USUARIO_A);
    store.carregar();
    const pendenteDeA = httpMock.expectOne(CONTAGEM_URL);

    auth.clearSession();
    entrarComo(USUARIO_B);
    pendenteDeA.flush({ naoLidas: 7 });

    expect(store.contagem()).toBeNull();
  });

  it('B pedindo com a consulta de A em voo cancela a de A e mostra so a de B', () => {
    entrarComo(USUARIO_A);
    store.carregar();
    const pendenteDeA = httpMock.expectOne(CONTAGEM_URL);

    auth.clearSession();
    entrarComo(USUARIO_B);
    store.carregar();

    expect(pendenteDeA.cancelled).toBe(true);
    httpMock.expectOne(CONTAGEM_URL).flush({ naoLidas: 0 });
    expect(store.contagem()).toEqual({ situacao: 'conhecida', naoLidas: 0 });
  });

  it('logout cancela a consulta que ainda estava em voo', () => {
    entrarComo(USUARIO_A);
    store.carregar();
    const pendenteDeA = httpMock.expectOne(CONTAGEM_URL);

    auth.clearSession();
    TestBed.tick();

    expect(pendenteDeA.cancelled).toBe(true);
  });

  it('contagem de A nao reaparece quando A volta a logar; comeca carregando', () => {
    entrarComo(USUARIO_A);
    store.carregar();
    httpMock.expectOne(CONTAGEM_URL).flush({ naoLidas: 5 });

    auth.clearSession();
    // A navegacao para /login roda change detection entre o logout e o novo login; o tick simula.
    TestBed.tick();
    entrarComo(USUARIO_A);
    store.carregar();

    expect(store.contagem()).toEqual({ situacao: 'carregando' });
    httpMock.expectOne(CONTAGEM_URL).flush({ naoLidas: 2 });
    expect(store.contagem()).toEqual({ situacao: 'conhecida', naoLidas: 2 });
  });
  describe('registrarLeitura', () => {
    it('com contagem conhecida baixa uma vez na hora e reconsulta para reconciliar', () => {
      entrarComo(USUARIO_A);
      store.carregar();
      httpMock.expectOne(CONTAGEM_URL).flush({ naoLidas: 3 });

      store.registrarLeitura();

      expect(store.contagem()).toEqual({ situacao: 'conhecida', naoLidas: 2 });
      httpMock.expectOne(CONTAGEM_URL).flush({ naoLidas: 1 });
      expect(store.contagem()).toEqual({ situacao: 'conhecida', naoLidas: 1 });
    });

    it('nunca fica negativa', () => {
      entrarComo(USUARIO_A);
      store.carregar();
      httpMock.expectOne(CONTAGEM_URL).flush({ naoLidas: 0 });

      store.registrarLeitura();

      expect(store.contagem()).toEqual({ situacao: 'conhecida', naoLidas: 0 });
      httpMock.expectOne(CONTAGEM_URL).flush({ naoLidas: 0 });
    });

    it('cancela a contagem pedida antes da leitura: o numero antigo nao volta', () => {
      entrarComo(USUARIO_A);
      store.carregar();
      httpMock.expectOne(CONTAGEM_URL).flush({ naoLidas: 3 });
      store.carregar();
      const anteriorALeitura = httpMock.expectOne(CONTAGEM_URL);

      store.registrarLeitura();

      expect(anteriorALeitura.cancelled).toBe(true);
      expect(store.contagem()).toEqual({ situacao: 'conhecida', naoLidas: 2 });
      httpMock.expectOne(CONTAGEM_URL).flush({ naoLidas: 2 });
    });

    it('contagem desconhecida continua desconhecida ate a reconsulta: nao inventa numero', () => {
      entrarComo(USUARIO_A);
      store.carregar();
      const primeira = httpMock.expectOne(CONTAGEM_URL);

      store.registrarLeitura();

      expect(primeira.cancelled).toBe(true);
      expect(store.contagem()).toEqual({ situacao: 'carregando' });
      httpMock.expectOne(CONTAGEM_URL).flush({ naoLidas: 4 });
      expect(store.contagem()).toEqual({ situacao: 'conhecida', naoLidas: 4 });
    });

    it('contagem indisponivel nao vira numero pela baixa local', () => {
      entrarComo(USUARIO_A);
      store.carregar();
      httpMock.expectOne(CONTAGEM_URL).flush(null, { status: 500, statusText: 'Erro' });

      store.registrarLeitura();

      expect(store.contagem()).toEqual({ situacao: 'indisponivel' });
      httpMock.expectOne(CONTAGEM_URL).flush({ naoLidas: 1 });
      expect(store.contagem()).toEqual({ situacao: 'conhecida', naoLidas: 1 });
    });

    it('reconsulta que falha nao desfaz a baixa da leitura confirmada', () => {
      entrarComo(USUARIO_A);
      store.carregar();
      httpMock.expectOne(CONTAGEM_URL).flush({ naoLidas: 3 });

      store.registrarLeitura();
      httpMock.expectOne(CONTAGEM_URL).flush(null, { status: 503, statusText: 'Erro' });

      expect(store.contagem()).toEqual({ situacao: 'conhecida', naoLidas: 2 });
    });

    it('sem sessao nao faz nada', () => {
      store.registrarLeitura();

      httpMock.expectNone(CONTAGEM_URL);
      expect(store.contagem()).toBeNull();
    });
  });
});
