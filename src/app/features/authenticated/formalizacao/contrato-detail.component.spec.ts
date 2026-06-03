import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { server } from '../../../../mocks/server';
import { ContratoDetailComponent } from './contrato-detail.component';

const CONTRATO_AGUARDANDO_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e01';
const CONTRATO_EM_ASSINATURA_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e02';
const CONTRATO_SEM_VERSAO_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e05';
const CONTRATO_INEXISTENTE_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771dead';

async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

async function estabilizar(fixture: ComponentFixture<unknown>): Promise<void> {
  await fixture.whenStable();
  await flush();
  fixture.detectChanges();
}

function activatedRoute(id: string) {
  return { snapshot: { paramMap: convertToParamMap({ id }) } };
}

function renderDetail(id: string) {
  return render(ContratoDetailComponent, {
    providers: [
      provideHttpClient(),
      provideRouter([]),
      { provide: ActivatedRoute, useValue: activatedRoute(id) },
    ],
  });
}

describe('ContratoDetailComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('exibe status, conteudo da versao vigente, clausulas e hash', async () => {
    const { fixture } = await renderDetail(CONTRATO_AGUARDANDO_ID);
    await estabilizar(fixture);

    expect(screen.getByText('Aguardando aceite')).toBeTruthy();
    expect(screen.getByText('OBJETO')).toBeTruthy();
    expect(screen.getByText('PRAZO')).toBeTruthy();
    expect(
      screen.getByText('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'),
    ).toBeTruthy();
  });

  it('alterna a visualizacao entre versoes sem mutar o contrato', async () => {
    const { fixture } = await renderDetail(CONTRATO_EM_ASSINATURA_ID);
    await estabilizar(fixture);

    // Vigente (versao 2) selecionada por padrao -> hash bb22.
    expect(screen.getByText('bb22')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Versao 1/ }));
    fixture.detectChanges();

    // Apos selecionar a versao 1, mostra o hash aa11.
    expect(screen.getByText('aa11')).toBeTruthy();
  });

  it('mantem a leitura do contrato quando o historico de versoes falha', async () => {
    server.use(
      http.get('http://localhost:8080/api/v1/contratos/:id/versoes', () =>
        HttpResponse.json({ message: 'erro' }, { status: 500 }),
      ),
    );

    const { fixture } = await renderDetail(CONTRATO_AGUARDANDO_ID);
    await estabilizar(fixture);

    expect(screen.getByText('OBJETO')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('mostra estado "sem versao gerada" quando o contrato nao tem versao vigente', async () => {
    const { fixture } = await renderDetail(CONTRATO_SEM_VERSAO_ID);
    await estabilizar(fixture);

    expect(screen.getByText(/ainda nao tem versao gerada/)).toBeTruthy();
  });

  it('exibe mensagem de erro quando o contrato nao existe (404)', async () => {
    const { fixture } = await renderDetail(CONTRATO_INEXISTENTE_ID);
    await estabilizar(fixture);

    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
