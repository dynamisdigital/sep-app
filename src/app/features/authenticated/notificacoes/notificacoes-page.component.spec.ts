import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { fireEvent, render, screen, within } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AuthService } from '../../../core/auth/auth.service';
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

      expect(screen.getByRole('status')).toHaveTextContent('Carregando notificacoes...');
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
      expect(screen.queryByRole('status')).toBeNull();
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

    it('pagina alem do fim nao afirma que a central inteira esta vazia', async () => {
      server.use(http.get(LISTA_URL, () => HttpResponse.json(pagina([], 12))));
      const { fixture } = await abrirCentralComo('tomador@empresa.com');

      expect(screen.getByText('Esta pagina nao tem notificacoes.')).toBeTruthy();
      expect(screen.queryByText('Voce nao tem notificacoes.')).toBeNull();

      server.resetHandlers();
      fireEvent.click(screen.getByRole('button', { name: 'Ir para a primeira pagina' }));
      await estabilizar(fixture);

      expect(within(lista()).getAllByRole('listitem')).toHaveLength(10);
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
