import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
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

    expect(screen.getByText('Nenhum recebimento Pix divergente em aberto.')).toBeTruthy();
    expect(screen.getByText('Nenhum desembolso Pix com falha em aberto.')).toBeTruthy();
  });

  it('mostra erro quando a fila falha', async () => {
    server.use(http.get(FILA_URL, () => HttpResponse.json({ message: 'erro' }, { status: 500 })));
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
