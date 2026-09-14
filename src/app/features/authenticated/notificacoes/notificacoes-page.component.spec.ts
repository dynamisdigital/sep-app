import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { fireEvent, render, screen, within } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AuthService } from '../../../core/auth/auth.service';
import { NotificacoesNaoLidasStore } from '../../../core/notificacoes/notificacoes-nao-lidas.store';
import { LUCIDE_ICONS } from '../../../core/icons/lucide-icons';
import { authInterceptor } from '../../../core/interceptors/auth.interceptor';
import { resetLoginMockState, resetNotificacoesState } from '../../../../mocks/handlers';
import { server } from '../../../../mocks/server';
import { estabilizar, flush } from '../../../../testing/estabilizar';
import { NotificacoesPageComponent } from './notificacoes-page.component';

const API = 'http://localhost:8080/api/v1';
const LISTA_URL = `${API}/notificacoes`;

function item(id: string, extras: Record<string, unknown> = {}) {
  return {
    id,
    tipo: 'DESEMBOLSO_PIX_CONCLUIDO',
    titulo: 'Desembolso concluido',
    mensagem: 'A transferencia Pix do desembolso do seu contrato foi concluida.',
    criadaEm: '2026-09-14T10:00:00-03:00',
    lidaEm: null,
    referencia: null,
    ...extras,
  };
}

function pagina(content: unknown[], totalElements = content.length) {
  return { content, totalElements, totalPages: 1, number: 0, size: 10 };
}

// Renderiza sem detectar mudancas, loga pelo MSW e so entao dispara o ngOnInit: a central e rota
// autenticada e o mock recusa consulta sem Authorization, como o backend.
async function abrirCentralComo(username: string, esperarEstavel = true) {
  const result = await render(NotificacoesPageComponent, {
    providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([authInterceptor])),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
    ],
    detectChangesOnRender: false,
    autoDetectChanges: false,
  });
  const auth = result.fixture.debugElement.injector.get(AuthService);
  await new Promise<void>((resolve, reject) => {
    auth
      .login({ username, password: '123456' })
      .subscribe({ next: () => resolve(), error: reject });
  });
  result.fixture.autoDetectChanges();
  if (esperarEstavel) {
    await estabilizar(result.fixture);
  } else {
    await flush();
    result.fixture.detectChanges();
  }
  return result;
}

function lista(): HTMLElement {
  return screen.getByRole('list', { name: 'Notificacoes' });
}

describe('NotificacoesPageComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetLoginMockState();
    resetNotificacoesState();
  });

  afterEach(() => {
    server.events.removeAllListeners();
  });

  describe('abertura', () => {
    it('move o foco para o titulo e nao aninha outro main no do shell', async () => {
      const { container } = await abrirCentralComo('tomador@empresa.com');

      const titulo = screen.getByRole('heading', { level: 1, name: 'Notificacoes' });
      expect(document.activeElement).toBe(titulo);
      expect(container.querySelector('main')).toBeNull();
    });

    it('diz na tela quando o contador atualiza, porque ele nao e tempo real', async () => {
      await abrirCentralComo('tomador@empresa.com');

      expect(
        screen.getByText(
          'O contador no topo atualiza ao abrir esta central e ao marcar um aviso como lido.',
          { exact: false },
        ),
      ).toBeTruthy();
    });

    it('abrir a central reconsulta a contagem de nao lidas', async () => {
      let contagens = 0;
      server.events.on('request:start', ({ request }) => {
        if (request.url.endsWith('/notificacoes/nao-lidas/contagem')) {
          contagens += 1;
        }
      });

      await abrirCentralComo('tomador@empresa.com');

      expect(contagens).toBe(1);
    });
  });

  describe('as quatro superficies', () => {
    it('carregando: so o aviso de carregamento, sem lista, vazio nem erro', async () => {
      server.use(
        http.get(LISTA_URL, async () => {
          await delay('infinite');
          return HttpResponse.json(pagina([]));
        }),
      );

      await abrirCentralComo('tomador@empresa.com', false);

      expect(screen.getByText('Carregando notificacoes...')).toHaveAttribute('role', 'status');
      expect(screen.queryByRole('list', { name: 'Notificacoes' })).toBeNull();
      expect(screen.queryByText('Voce nao tem notificacoes.')).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
    });

    // So a data e afirmada: o horario depende do fuso da maquina (CI em UTC, dev em -03).
    it('lista: itens na ordem do servidor, com data e estado de leitura por extenso', async () => {
      await abrirCentralComo('tomador@empresa.com');

      // O happy-dom da o papel implicito; o atributo e o que protege no Safari/VoiceOver.
      expect(lista()).toHaveAttribute('role', 'list');
      const itens = within(lista()).getAllByRole('listitem');
      expect(itens).toHaveLength(10);
      expect(itens[0]).toHaveTextContent('Desembolso concluido');
      expect(itens[0]).toHaveTextContent(
        'A transferencia Pix do desembolso do seu contrato foi concluida.',
      );
      expect(itens[0]).toHaveTextContent('Recebida em 12/09/2026');
      expect(itens[0]).toHaveTextContent('Nao lida');
      expect(itens[2]).toHaveTextContent('Nao lida');
      expect(itens[3]).toHaveTextContent('Lida em 09/09/2026');
      expect(itens[9]).toHaveTextContent('Recebida em 03/09/2026');
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('vazio: 200 com lista vazia e a superficie de vazio, nao a de erro', async () => {
      await abrirCentralComo('credora@empresa.com');

      expect(screen.getByText('Voce nao tem notificacoes.')).toBeTruthy();
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.queryByRole('list', { name: 'Notificacoes' })).toBeNull();
      expect(screen.queryByRole('navigation', { name: 'Paginacao das notificacoes' })).toBeNull();
    });

    it('erro: alerta com retry por gesto, e o retry mostra a lista', async () => {
      server.use(
        http.get(LISTA_URL, () => new HttpResponse(null, { status: 503 }), { once: true }),
      );
      const { fixture } = await abrirCentralComo('tomador@empresa.com');

      const alerta = screen.getByRole('alert');
      expect(alerta).toHaveTextContent('Nao foi possivel carregar suas notificacoes.');
      expect(screen.queryByText('Voce nao tem notificacoes.')).toBeNull();

      fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar novamente' }));
      await estabilizar(fixture);

      expect(within(lista()).getAllByRole('listitem')).toHaveLength(10);
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('resposta sem content e erro, nunca central vazia', async () => {
      server.use(http.get(LISTA_URL, () => HttpResponse.json({ totalElements: 0 })));

      await abrirCentralComo('tomador@empresa.com');

      expect(screen.getByRole('alert')).toBeTruthy();
      expect(screen.queryByText('Voce nao tem notificacoes.')).toBeNull();
    });
  });

  describe('mensagem de erro', () => {
    it.each([
      ['corpo nulo', () => new HttpResponse(null, { status: 500 })],
      [
        'HTML de proxy',
        () =>
          new HttpResponse('<html><body>Bad gateway</body></html>', {
            status: 502,
            headers: { 'Content-Type': 'text/html' },
          }),
      ],
      ['objeto sem message', () => HttpResponse.json({ status: 500 }, { status: 500 })],
      ['message nao-string', () => HttpResponse.json({ message: 42 }, { status: 500 })],
    ])('%s cai no texto padrao sem travar a tela', async (_caso, resposta) => {
      server.use(http.get(LISTA_URL, resposta));

      await abrirCentralComo('tomador@empresa.com');

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Nao foi possivel carregar suas notificacoes.',
      );
      expect(screen.queryByText('Carregando notificacoes...')).toBeNull();
    });

    it('usa a mensagem do backend quando ela vem', async () => {
      server.use(
        http.get(LISTA_URL, () =>
          HttpResponse.json(
            {
              message: 'Paginacao invalida: page deve ser maior ou igual a 0 e size entre 1 e 100',
              codigo: 'NTF-400-001',
            },
            { status: 400 },
          ),
        ),
      );

      await abrirCentralComo('tomador@empresa.com');

      expect(screen.getByRole('alert')).toHaveTextContent('Paginacao invalida');
    });
  });

  describe('conteudo dos itens', () => {
    it('lidaEm e referencia ausentes do corpo nao quebram a renderizacao', async () => {
      const semOpcionais = item('9f0799c0-98b9-6d9d-bc4a-7d6f5b79e001');
      delete (semOpcionais as Record<string, unknown>)['lidaEm'];
      delete (semOpcionais as Record<string, unknown>)['referencia'];
      server.use(http.get(LISTA_URL, () => HttpResponse.json(pagina([semOpcionais]))));

      await abrirCentralComo('tomador@empresa.com');

      const itens = within(lista()).getAllByRole('listitem');
      expect(itens).toHaveLength(1);
      expect(itens[0]).toHaveTextContent('Nao lida');
    });

    it('lidaEm nulo explicito le como nao lida', async () => {
      server.use(
        http.get(LISTA_URL, () =>
          HttpResponse.json(pagina([item('9f0799c0-98b9-6d9d-bc4a-7d6f5b79e002')])),
        ),
      );

      await abrirCentralComo('tomador@empresa.com');

      expect(within(lista()).getByRole('listitem')).toHaveTextContent('Nao lida');
    });

    it('titulo e mensagem sao texto, nunca HTML', async () => {
      server.use(
        http.get(LISTA_URL, () =>
          HttpResponse.json(
            pagina([
              item('9f0799c0-98b9-6d9d-bc4a-7d6f5b79e003', {
                titulo: '<b>Titulo</b>',
                mensagem: '<img src=x onerror=alert(1)>',
              }),
            ]),
          ),
        ),
      );

      await abrirCentralComo('tomador@empresa.com');

      const unico = within(lista()).getByRole('listitem');
      expect(unico).toHaveTextContent('<b>Titulo</b>');
      expect(unico).toHaveTextContent('<img src=x onerror=alert(1)>');
      expect(unico.querySelector('b, img')).toBeNull();
    });

    it('referencia nao vira link: nenhuma navegacao dentro da lista', async () => {
      await abrirCentralComo('tomador@empresa.com');

      expect(within(lista()).queryAllByRole('link')).toHaveLength(0);
    });
  });

  describe('marcar como lida', () => {
    function botoesMarcar(): HTMLElement[] {
      return screen.queryAllByRole('button', { name: 'Marcar como lida' });
    }

    it('abrir a central nao marca nada: a leitura e sempre um gesto', async () => {
      let leituras = 0;
      server.events.on('request:start', ({ request }) => {
        if (request.method === 'POST' && request.url.endsWith('/leitura')) {
          leituras += 1;
        }
      });

      await abrirCentralComo('tomador@empresa.com');

      expect(leituras).toBe(0);
      expect(botoesMarcar()).toHaveLength(3);
    });

    it('aplica a lidaEm do servidor, anuncia e leva o foco ao titulo do aviso', async () => {
      server.use(
        http.post(`${LISTA_URL}/:id/leitura`, ({ params }) =>
          HttpResponse.json(item(params['id'] as string, { lidaEm: '2026-09-13T08:00:00-03:00' })),
        ),
      );
      const { fixture } = await abrirCentralComo('tomador@empresa.com');

      const primeiro = within(lista()).getAllByRole('listitem')[0];
      fireEvent.click(within(primeiro).getByRole('button', { name: 'Marcar como lida' }));
      await estabilizar(fixture);

      const depois = within(lista()).getAllByRole('listitem')[0];
      expect(depois).toHaveTextContent('Lida em 13/09/2026');
      expect(depois).not.toHaveTextContent('Nao lida');
      expect(within(depois).queryByRole('button')).toBeNull();
      expect(screen.getByText('Aviso marcado como lido.')).toHaveAttribute('role', 'status');
      expect(document.activeElement).toBe(within(depois).getByRole('heading', { level: 2 }));
    });

    it('com o mock real, a leitura grava e a contagem reconciliada cai para 2', async () => {
      const { fixture } = await abrirCentralComo('tomador@empresa.com');
      const store = fixture.debugElement.injector.get(NotificacoesNaoLidasStore);

      const primeiro = within(lista()).getAllByRole('listitem')[0];
      fireEvent.click(within(primeiro).getByRole('button', { name: 'Marcar como lida' }));
      await estabilizar(fixture);
      await estabilizar(fixture);

      expect(store.contagem()).toEqual({ situacao: 'conhecida', naoLidas: 2 });
      expect(botoesMarcar()).toHaveLength(2);
    });

    it('404 e neutro: nada confirmado, e Atualizar lista reconsulta por gesto', async () => {
      server.use(
        http.post(`${LISTA_URL}/:id/leitura`, () =>
          HttpResponse.json(
            { message: 'Notificacao nao encontrada', codigo: 'NTF-404-001' },
            { status: 404 },
          ),
        ),
      );
      const { fixture } = await abrirCentralComo('tomador@empresa.com');
      const store = fixture.debugElement.injector.get(NotificacoesNaoLidasStore);
      let listagens = 0;
      server.events.on('request:start', ({ request }) => {
        if (request.method === 'GET' && new URL(request.url).pathname === '/api/v1/notificacoes') {
          listagens += 1;
        }
      });

      const primeiro = within(lista()).getAllByRole('listitem')[0];
      fireEvent.click(within(primeiro).getByRole('button', { name: 'Marcar como lida' }));
      await estabilizar(fixture);

      const alerta = within(within(lista()).getAllByRole('listitem')[0]).getByRole('alert');
      expect(alerta).toHaveTextContent(
        'Este aviso nao foi encontrado. Atualize a lista para ver seus avisos.',
      );
      expect(within(lista()).getAllByRole('listitem')[0]).toHaveTextContent('Nao lida');
      expect(store.contagem()).toEqual({ situacao: 'conhecida', naoLidas: 3 });

      fireEvent.click(within(alerta).getByRole('button', { name: 'Atualizar lista' }));
      await estabilizar(fixture);

      expect(listagens).toBe(1);
    });

    it('falha tecnica: nada confirmado, o foco fica no botao e o retry marca', async () => {
      server.use(
        http.post(`${LISTA_URL}/:id/leitura`, () => new HttpResponse(null, { status: 503 }), {
          once: true,
        }),
      );
      const { fixture } = await abrirCentralComo('tomador@empresa.com');
      const store = fixture.debugElement.injector.get(NotificacoesNaoLidasStore);

      const botao = within(within(lista()).getAllByRole('listitem')[0]).getByRole('button', {
        name: 'Marcar como lida',
      });
      botao.focus();
      fireEvent.click(botao);
      await estabilizar(fixture);

      const primeiro = within(lista()).getAllByRole('listitem')[0];
      expect(within(primeiro).getByRole('alert')).toHaveTextContent(
        'Nao foi possivel marcar o aviso como lido. Tente novamente.',
      );
      expect(primeiro).toHaveTextContent('Nao lida');
      expect(document.activeElement).toBe(botao);
      expect(botao).not.toHaveAttribute('aria-disabled');
      expect(store.contagem()).toEqual({ situacao: 'conhecida', naoLidas: 3 });

      fireEvent.click(botao);
      await estabilizar(fixture);

      expect(within(lista()).getAllByRole('listitem')[0]).toHaveTextContent('Lida em');
      expect(store.contagem()).toEqual({ situacao: 'conhecida', naoLidas: 2 });
    });
  });

  describe('paginacao', () => {
    it('pagina pelo totalElements e leva o foco ao titulo depois de trocar', async () => {
      const { fixture } = await abrirCentralComo('tomador@empresa.com');

      const nav = screen.getByRole('navigation', { name: 'Paginacao das notificacoes' });
      expect(nav).toHaveTextContent('Pagina 1 de 2');
      expect(screen.getByText('12 notificacoes')).toBeTruthy();
      expect(within(nav).getByRole('button', { name: 'Pagina anterior' })).toBeDisabled();

      // O happy-dom nao move foco no click: foca o botao antes, como o teclado faria.
      const proxima = within(nav).getByRole('button', { name: 'Proxima pagina' });
      proxima.focus();
      fireEvent.click(proxima);
      await estabilizar(fixture);

      const itens = within(lista()).getAllByRole('listitem');
      expect(itens).toHaveLength(2);
      expect(itens[1]).toHaveTextContent('Recebida em 02/09/2026');
      const navDepois = screen.getByRole('navigation', { name: 'Paginacao das notificacoes' });
      expect(navDepois).toHaveTextContent('Pagina 2 de 2');
      expect(within(navDepois).getByRole('button', { name: 'Proxima pagina' })).toBeDisabled();
      expect(document.activeElement).toBe(
        screen.getByRole('heading', { level: 1, name: 'Notificacoes' }),
      );
    });

    // O foco volta ao titulo, que o leitor de tela le; a pagina nova so e ouvida pela regiao de status.
    it('anuncia a pagina nova depois do gesto, e nao anuncia nada na abertura', async () => {
      const { fixture } = await abrirCentralComo('tomador@empresa.com');
      const regiao = screen.getByText('', { selector: '.sep-notificacoes-anuncio' });
      expect(regiao).toHaveAttribute('role', 'status');
      expect(regiao).toHaveTextContent('');

      fireEvent.click(screen.getByRole('button', { name: 'Proxima pagina' }));
      await estabilizar(fixture);

      expect(regiao).toHaveTextContent('Pagina 2 de 2');
    });

    it('pagina alem do fim nao afirma que a central inteira esta vazia', async () => {
      server.use(http.get(LISTA_URL, () => HttpResponse.json(pagina([], 12))));
      const { fixture } = await abrirCentralComo('tomador@empresa.com');

      expect(screen.getByText('Esta pagina nao tem notificacoes.')).toBeTruthy();
      expect(screen.queryByText('Voce nao tem notificacoes.')).toBeNull();

      server.resetHandlers();
      fireEvent.click(screen.getByRole('button', { name: 'Ir para a primeira pagina' }));
      await estabilizar(fixture);

      expect(within(lista()).getAllByRole('listitem')).toHaveLength(10);
      expect(
        screen.getByText('Pagina 1 de 2', { selector: '.sep-notificacoes-anuncio' }),
      ).toBeTruthy();
    });

    it('com uma pagina so, nao mostra a navegacao de paginas', async () => {
      server.use(
        http.get(LISTA_URL, () =>
          HttpResponse.json(pagina([item('9f0799c0-98b9-6d9d-bc4a-7d6f5b79e004')])),
        ),
      );

      await abrirCentralComo('tomador@empresa.com');

      expect(screen.queryByRole('navigation', { name: 'Paginacao das notificacoes' })).toBeNull();
    });
  });
});

// Ordem das respostas: controlada pelo HttpTestingController, que o MSW nao deixa segurar.
describe('NotificacoesPageComponent — consultas sobrepostas', () => {
  it('trocar de pagina cancela a consulta anterior; a resposta velha nunca aparece', async () => {
    const { fixture } = await render(NotificacoesPageComponent, {
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      ],
    });
    const httpMock = fixture.debugElement.injector.get(HttpTestingController);
    const primeira = httpMock.expectOne((r) => r.url === LISTA_URL);
    primeira.flush(pagina([item('9f0799c0-98b9-6d9d-bc4a-7d6f5b79f001')], 12));
    await estabilizar(fixture);

    fixture.componentInstance.irParaPagina(1);
    const segunda = httpMock.expectOne((r) => r.url === LISTA_URL && r.params.get('page') === '1');
    fixture.componentInstance.irParaPagina(0);
    const terceira = httpMock.expectOne((r) => r.url === LISTA_URL && r.params.get('page') === '0');

    expect(segunda.cancelled).toBe(true);
    terceira.flush(
      pagina([item('9f0799c0-98b9-6d9d-bc4a-7d6f5b79f003', { titulo: 'Da pagina atual' })], 12),
    );
    await estabilizar(fixture);

    expect(within(lista()).getByRole('listitem')).toHaveTextContent('Da pagina atual');
    expect(
      screen.getByRole('navigation', { name: 'Paginacao das notificacoes' }),
    ).toHaveTextContent('Pagina 1 de 2');
    httpMock.verify();
  });
});

// Leitura com as respostas na ordem que o teste quiser: e o HttpTestingController, e nao o MSW, que
// deixa segurar o POST, a lista e a contagem para provar baixa unica e resposta tardia.
describe('NotificacoesPageComponent — leitura com respostas controladas', () => {
  const CONTAGEM_URL = `${API}/notificacoes/nao-lidas/contagem`;
  const IDS = [
    '9f0799c0-98b9-6d9d-bc4a-7d6f5b79f101',
    '9f0799c0-98b9-6d9d-bc4a-7d6f5b79f102',
    '9f0799c0-98b9-6d9d-bc4a-7d6f5b79f103',
  ];
  const LIDA_EM = '2026-09-13T08:00:00-03:00';

  afterEach(() => {
    window.localStorage.clear();
  });

  async function abrirComTresNaoLidas() {
    const result = await render(NotificacoesPageComponent, {
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      ],
      detectChangesOnRender: false,
      autoDetectChanges: false,
    });
    const injector = result.fixture.debugElement.injector;
    injector.get(AuthService).applyMfaVerifyResponse({
      accessToken: 'token-tomador',
      tokenType: 'Bearer',
      expiresIn: 3600,
      refreshToken: null,
      usuario: {
        id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771011',
        username: 'tomador@empresa.com',
        role: 'CLIENTE',
        precisaRedefinirSenha: false,
        mfaHabilitado: true,
        dataCriacao: '2026-09-14T10:00:00-03:00',
        dataModificacao: '2026-09-14T10:00:00-03:00',
        criadoPor: 'system',
        modificadoPor: 'system',
      },
      mfaRequired: false,
      mfaChallengeId: null,
    });
    const httpMock = injector.get(HttpTestingController);
    const store = injector.get(NotificacoesNaoLidasStore);
    result.fixture.autoDetectChanges();
    httpMock.expectOne(CONTAGEM_URL).flush({ naoLidas: 3 });
    httpMock.expectOne((r) => r.url === LISTA_URL).flush(pagina(IDS.map((id) => item(id))));
    await estabilizar(result.fixture);
    return { fixture: result.fixture, httpMock, store };
  }

  function leituraDe(httpMock: HttpTestingController, id: string) {
    return httpMock.expectOne({ method: 'POST', url: `${LISTA_URL}/${id}/leitura` });
  }

  it('a baixa do contador aparece antes da recontagem responder', async () => {
    const { fixture, httpMock, store } = await abrirComTresNaoLidas();

    fixture.componentInstance.marcarComoLida(IDS[0]);
    leituraDe(httpMock, IDS[0]).flush(item(IDS[0], { lidaEm: LIDA_EM }));
    await estabilizar(fixture);

    expect(store.contagem()).toEqual({ situacao: 'conhecida', naoLidas: 2 });
    httpMock.expectOne(CONTAGEM_URL).flush({ naoLidas: 2 });
    httpMock.verify();
  });

  it('duplo gesto e chamada direta com a leitura em voo geram um POST so', async () => {
    const { fixture, httpMock } = await abrirComTresNaoLidas();

    fixture.componentInstance.marcarComoLida(IDS[1]);
    fixture.componentInstance.marcarComoLida(IDS[1]);
    await estabilizar(fixture);
    const botao = within(within(lista()).getAllByRole('listitem')[1]).getByRole('button');
    expect(botao).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(botao);

    leituraDe(httpMock, IDS[1]).flush(item(IDS[1], { lidaEm: LIDA_EM }));
    httpMock.expectOne(CONTAGEM_URL).flush({ naoLidas: 2 });
    httpMock.verify();
  });

  it('aviso ja lido nao chama o servidor nem baixa o contador de novo', async () => {
    const { fixture, httpMock, store } = await abrirComTresNaoLidas();
    fixture.componentInstance.marcarComoLida(IDS[0]);
    leituraDe(httpMock, IDS[0]).flush(item(IDS[0], { lidaEm: LIDA_EM }));
    httpMock.expectOne(CONTAGEM_URL).flush({ naoLidas: 2 });
    await estabilizar(fixture);

    fixture.componentInstance.marcarComoLida(IDS[0]);

    httpMock.expectNone({ method: 'POST', url: `${LISTA_URL}/${IDS[0]}/leitura` });
    httpMock.expectNone(CONTAGEM_URL);
    expect(store.contagem()).toEqual({ situacao: 'conhecida', naoLidas: 2 });
  });

  it('lista pedida antes da confirmacao nao ressuscita o aviso como nao lido', async () => {
    const { fixture, httpMock } = await abrirComTresNaoLidas();

    fixture.componentInstance.marcarComoLida(IDS[0]);
    const leitura = leituraDe(httpMock, IDS[0]);
    fixture.componentInstance.irParaPagina(0);
    const listaAnterior = httpMock.expectOne((r) => r.url === LISTA_URL);
    leitura.flush(item(IDS[0], { lidaEm: LIDA_EM }));
    httpMock.expectOne(CONTAGEM_URL).flush({ naoLidas: 2 });
    listaAnterior.flush(pagina(IDS.map((id) => item(id))));
    await estabilizar(fixture);

    const primeiro = within(lista()).getAllByRole('listitem')[0];
    expect(primeiro).toHaveTextContent('Lida em 13/09/2026');
    expect(within(primeiro).queryByRole('button')).toBeNull();
    httpMock.verify();
  });

  it('POST que falha nao baixa nem reconsulta, e o retry usa o mesmo id', async () => {
    const { fixture, httpMock, store } = await abrirComTresNaoLidas();

    fixture.componentInstance.marcarComoLida(IDS[2]);
    // Timeout/queda de rede: o servidor pode ter gravado; o retry confia na idempotencia do POST.
    leituraDe(httpMock, IDS[2]).error(new ProgressEvent('error'), { status: 0 });
    await estabilizar(fixture);

    httpMock.expectNone(CONTAGEM_URL);
    expect(store.contagem()).toEqual({ situacao: 'conhecida', naoLidas: 3 });

    fixture.componentInstance.marcarComoLida(IDS[2]);
    leituraDe(httpMock, IDS[2]).flush(item(IDS[2], { lidaEm: LIDA_EM }));
    await estabilizar(fixture);

    expect(store.contagem()).toEqual({ situacao: 'conhecida', naoLidas: 2 });
    httpMock.expectOne(CONTAGEM_URL).flush({ naoLidas: 2 });
    httpMock.verify();
  });
});
