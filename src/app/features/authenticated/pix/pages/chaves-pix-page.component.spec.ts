import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { ChavePixResponse } from '../../../../core/api/api.models';
import { server } from '../../../../../mocks/server';
import { PIX_ROUTES } from '../pix.routes';
import { ChavesPixPageComponent } from './chaves-pix-page.component';

const CHAVES_URL = 'http://localhost:8080/api/v1/pix/chaves';

// Fixtures sempre mascaradas: o backend nunca devolve o valor integral da chave.
const CHAVE_ATIVA: ChavePixResponse = {
  id: 'e3000000-0000-4000-8000-000000000001',
  tipo: 'EMAIL',
  valorMascarado: 'fin***@dynamis.com.br',
  status: 'ATIVA',
  criadaEm: '2026-07-10T09:00:00-03:00',
  removidaEm: null,
};
const CHAVE_INATIVA: ChavePixResponse = {
  id: 'e3000000-0000-4000-8000-000000000002',
  tipo: 'CNPJ',
  valorMascarado: '**.***.***/0001-**',
  status: 'INATIVA',
  criadaEm: '2026-06-02T09:00:00-03:00',
  removidaEm: '2026-07-01T14:20:00-03:00',
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
  return render(ChavesPixPageComponent, {
    providers: [provideHttpClient(), provideRouter([])],
  });
}

// Conta os GETs recebidos e responde com o corpo dado. Serve para provar tanto a chamada unica
// da entrada quanto a ausencia de polling.
function stubLista(chaves: ChavePixResponse[]): { total: () => number } {
  let chamadas = 0;
  server.use(
    http.get(CHAVES_URL, () => {
      chamadas += 1;
      return HttpResponse.json(chaves);
    }),
  );
  return { total: () => chamadas };
}

describe('ChavesPixPageComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // O guard proprio da sub-rota e mais restrito que o pai /app/pix (que inclui BACKOFFICE): o
  // backend limita as tres operacoes de chave a FINANCEIRO/ADMIN.
  it('rota /app/pix/chaves e protegida por roleGuard para FINANCEIRO/ADMIN', () => {
    const rota = PIX_ROUTES.find((r) => r.path === 'chaves');

    expect(rota).toBeTruthy();
    expect(rota?.canActivate?.length).toBe(1);
    expect(rota?.data?.['roles']).toEqual(['FINANCEIRO', 'ADMIN']);
    expect(rota?.data?.['roles']).not.toContain('BACKOFFICE');
  });

  it('lista as chaves mascaradas com tipo, status e datas', async () => {
    stubLista([CHAVE_ATIVA, CHAVE_INATIVA]);
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    expect(screen.getByText('fin***@dynamis.com.br')).toBeTruthy();
    expect(screen.getByText('**.***.***/0001-**')).toBeTruthy();
    expect(screen.getByText('E-mail')).toBeTruthy();
    expect(screen.getByText('CNPJ')).toBeTruthy();
    // Badge textual: a cor nao e o unico portador do estado.
    expect(screen.getByText('Ativa')).toBeTruthy();
    expect(screen.getByText('Inativa')).toBeTruthy();
  });

  it('preserva a ordem recebida do backend, sem reordenar', async () => {
    stubLista([CHAVE_ATIVA, CHAVE_INATIVA]);
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    const linhas = document.querySelectorAll('tbody tr');
    expect(linhas[0].textContent).toContain('fin***@dynamis.com.br');
    expect(linhas[1].textContent).toContain('**.***.***/0001-**');
  });

  it('nao exibe data de remocao enquanto a chave esta ATIVA', async () => {
    stubLista([CHAVE_ATIVA]);
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    const celulas = document.querySelectorAll('tbody tr td');
    expect(celulas[celulas.length - 1].textContent?.trim()).toBe('—');
  });

  it('superficie vazia: 200 [] mostra mensagem neutra, sem fabricar linhas', async () => {
    stubLista([]);
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    expect(screen.getByText('Nenhuma chave Pix cadastrada para a conta operacional.')).toBeTruthy();
    expect(document.querySelector('tbody')).toBeNull();
  });

  it('superficie de erro: 500 mostra alerta com retry, sem listar nada', async () => {
    server.use(http.get(CHAVES_URL, () => new HttpResponse(null, { status: 500 })));
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Tentar novamente')).toBeTruthy();
    expect(document.querySelector('tbody')).toBeNull();
  });

  it('retry apos erro recarrega e mostra a lista', async () => {
    server.use(http.get(CHAVES_URL, () => new HttpResponse(null, { status: 500 })));
    const { fixture } = await renderPage();
    await estabilizar(fixture);
    expect(screen.getByRole('alert')).toBeTruthy();

    stubLista([CHAVE_ATIVA]);
    fireEvent.click(screen.getByText('Tentar novamente'));
    await estabilizar(fixture);

    expect(screen.getByText('fin***@dynamis.com.br')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('consulta uma unica vez na entrada e nao faz polling', async () => {
    const stub = stubLista([CHAVE_ATIVA]);
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    expect(stub.total()).toBe(1);

    // Sem gesto novo, nenhuma consulta adicional deve nascer (nem por interval nem por foco).
    await estabilizar(fixture);
    await estabilizar(fixture);
    expect(stub.total()).toBe(1);
  });

  it('o botao Atualizar reconsulta por gesto explicito', async () => {
    const stub = stubLista([CHAVE_ATIVA]);
    const { fixture } = await renderPage();
    await estabilizar(fixture);
    expect(stub.total()).toBe(1);

    fireEvent.click(screen.getByText('Atualizar'));
    await estabilizar(fixture);

    expect(stub.total()).toBe(2);
  });

  it('nao oferece nenhuma acao de mutacao nesta Task (somente leitura)', async () => {
    stubLista([CHAVE_ATIVA, CHAVE_INATIVA]);
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    expect(screen.queryByText('Cadastrar chave')).toBeNull();
    expect(screen.queryByText('Remover')).toBeNull();
  });
});
