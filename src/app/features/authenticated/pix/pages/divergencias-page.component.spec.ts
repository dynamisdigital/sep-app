import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { server } from '../../../../../mocks/server';
import { DivergenciasPageComponent } from './divergencias-page.component';

const ITEM_RECEBIMENTO_PIX_ID = 'c0000000-0000-4000-8000-000000000006';
const ITEM_DESEMBOLSO_PIX_ID = 'c0000000-0000-4000-8000-000000000005';
const RECEBIMENTO_ENTIDADE_ID = 'e2000000-0000-4000-8000-000000000002';
const DESEMBOLSO_ENTIDADE_ID = 'd0000000-0000-4000-8000-000000000002';
const FILA_URL = 'http://localhost:8080/api/v1/backoffice/fila';
const PAGE_VAZIA = {
  content: [],
  totalElements: 0,
  totalPages: 1,
  number: 0,
  size: 50,
  first: true,
  last: true,
  numberOfElements: 0,
  empty: true,
};

async function flush(times = 6): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

async function estabilizar(fixture: ComponentFixture<unknown>): Promise<void> {
  await fixture.whenStable();
  await flush();
  fixture.detectChanges();
}

function renderPage() {
  return render(DivergenciasPageComponent, {
    providers: [provideHttpClient(), provideRouter([])],
  });
}

describe('DivergenciasPageComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('lista recebimento divergente e desembolso falho da fila do backoffice', async () => {
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    expect(screen.getByText('Recebimento Pix sem referencia identificada')).toBeTruthy();
    expect(screen.getByText('Desembolso Pix retornou falha do provedor')).toBeTruthy();
  });

  it('cada item leva ao tratamento no backoffice e ao contexto Pix', async () => {
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    const tratar = screen.getAllByText('Tratar no backoffice');
    expect(tratar[0].getAttribute('href')).toBe(`/app/backoffice/fila/${ITEM_RECEBIMENTO_PIX_ID}`);
    expect(tratar[1].getAttribute('href')).toBe(`/app/backoffice/fila/${ITEM_DESEMBOLSO_PIX_ID}`);

    expect(screen.getByText('Ver recebimento').getAttribute('href')).toBe(
      `/app/pix/recebimentos/${RECEBIMENTO_ENTIDADE_ID}`,
    );
    expect(screen.getByText('Reconsultar status').getAttribute('href')).toBe(
      `/app/pix/desembolsos/${DESEMBOLSO_ENTIDADE_ID}`,
    );
  });

  it('nao oferece reenviar Pix nem reprocessar provedor para recebimento', async () => {
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    expect(screen.queryByText(/Reenviar/i)).toBeNull();
    expect(screen.queryByText(/Reprocessar provedor/i)).toBeNull();
    // Nenhuma acao de mutacao na propria tela: tratamento e so via link para o backoffice.
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('mostra estado vazio quando nao ha divergencias', async () => {
    server.use(http.get(FILA_URL, () => HttpResponse.json(PAGE_VAZIA)));
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    expect(
      screen.getByText('Nenhum recebimento Pix divergente neste recorte de status.'),
    ).toBeTruthy();
    expect(
      screen.getByText('Nenhum desembolso Pix com falha neste recorte de status.'),
    ).toBeTruthy();
  });

  it('mostra erro quando a fila falha', async () => {
    server.use(http.get(FILA_URL, () => HttpResponse.json({ message: 'erro' }, { status: 500 })));
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('consulta com status ABERTO por default e mostra o total do backend em pagina parcial', async () => {
    const urls: string[] = [];
    server.use(
      http.get(FILA_URL, ({ request }) => {
        urls.push(request.url);
        const tipo = new URL(request.url).searchParams.get('tipo');
        const item =
          tipo === 'RECEBIMENTO_PIX_DIVERGENTE'
            ? itemFila(ITEM_RECEBIMENTO_PIX_ID, tipo, 'PIX_RECEBIMENTO', RECEBIMENTO_ENTIDADE_ID)
            : itemFila(
                ITEM_DESEMBOLSO_PIX_ID,
                tipo ?? '',
                'PIX_TRANSFERENCIA',
                DESEMBOLSO_ENTIDADE_ID,
              );
        return HttpResponse.json({
          ...PAGE_VAZIA,
          content: [item],
          totalElements: 120,
          numberOfElements: 1,
          empty: false,
        });
      }),
    );
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    expect(urls.length).toBe(2);
    for (const url of urls) {
      const params = new URL(url).searchParams;
      expect(params.get('status')).toBe('ABERTO');
      expect(params.get('size')).toBe('50');
    }
    // Titulo usa totalElements do backend, nunca o tamanho da pagina parcial.
    expect(screen.getByText(/Recebimentos Pix divergentes \(120\)/)).toBeTruthy();
    expect(screen.getByText(/Desembolsos Pix com falha \(120\)/)).toBeTruthy();
    expect(screen.getAllByText(/Mostrando os 1 primeiros de 120/).length).toBe(2);
  });

  it('mostra erro recuperavel quando a rede falha, sem resultado presumido', async () => {
    server.use(http.get(FILA_URL, () => HttpResponse.error()));
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Tentar novamente/ })).toBeTruthy();
    expect(screen.queryByText(/Recebimentos Pix divergentes/)).toBeNull();
  });

  it('recorte RESOLVIDO traz do backend o item ja tratado, ausente no default ABERTO', async () => {
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    expect(screen.queryByText('Desembolso Pix com falha ja reconciliado')).toBeNull();

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'RESOLVIDO' } });
    await estabilizar(fixture);

    expect(screen.getByText('Desembolso Pix com falha ja reconciliado')).toBeTruthy();
    expect(screen.queryByText('Desembolso Pix retornou falha do provedor')).toBeNull();
  });

  it('envia o status selecionado ao backend e omite o parametro em Todos', async () => {
    const statusEnviados: (string | null)[] = [];
    server.use(
      http.get(FILA_URL, ({ request }) => {
        statusEnviados.push(new URL(request.url).searchParams.get('status'));
        return HttpResponse.json(PAGE_VAZIA);
      }),
    );
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'RESOLVIDO' } });
    await estabilizar(fixture);
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: '' } });
    await estabilizar(fixture);

    // Cada carga consulta os dois tipos (recebimentos + desembolsos).
    expect(statusEnviados.slice(0, 2)).toEqual(['ABERTO', 'ABERTO']);
    expect(statusEnviados.slice(2, 4)).toEqual(['RESOLVIDO', 'RESOLVIDO']);
    expect(statusEnviados.slice(4, 6)).toEqual([null, null]);
  });
});

// Item minimo da fila com os campos que o template consome; espelha o ItemFilaResponse real.
function itemFila(id: string, tipo: string, tipoEntidade: string, entidadeId: string) {
  return {
    id,
    tipo,
    titulo: `Item ${id.slice(-4)}`,
    prioridade: 'ALTA',
    status: 'ABERTO',
    dataAbertura: '2026-06-01T10:00:00-03:00',
    atribuidoA: null,
    tipoEntidade,
    entidadeId,
  };
}
