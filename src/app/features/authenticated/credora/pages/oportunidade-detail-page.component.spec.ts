import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { Observable, of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';

import {
  ElegibilidadeCredoraResponse,
  InteresseResponse,
  OportunidadeResponse,
} from '../../../../core/api/api.models';
import { CredoraService } from '../../../../core/credora/credora.service';
import { OportunidadeDetailPageComponent } from './oportunidade-detail-page.component';

const OPORTUNIDADE_ID = '7f0799c0-98b9-6d9d-bc4a-7d6f5b78b001';

const DISPONIVEL: OportunidadeResponse = {
  id: OPORTUNIDADE_ID,
  propostaId: 'p-1',
  contratoId: 'c-1',
  valor: 25000,
  prazoMeses: 12,
  taxaJurosMensal: 0.025,
  status: 'DISPONIVEL',
  dataCriacao: '2026-05-28T12:00:00-03:00',
};

const ELEGIVEL: ElegibilidadeCredoraResponse = {
  status: 'ATIVA',
  elegibilidade: 'ELEGIVEL',
  motivoInelegibilidade: null,
};

const INTERESSE: InteresseResponse = {
  id: 'int-1',
  oportunidadeId: OPORTUNIDADE_ID,
  status: 'ATIVO',
  dataCriacao: '2026-05-28T12:00:00-03:00',
};

interface ServiceStub {
  consultarOportunidade: () => Observable<OportunidadeResponse>;
  consultarElegibilidade: () => Observable<ElegibilidadeCredoraResponse>;
  registrarInteresse: () => Observable<InteresseResponse>;
  cancelarInteresse: () => Observable<void>;
}

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

function erro(status: number, message: string): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: { message } });
}

function renderDetail(overrides: Partial<ServiceStub> = {}) {
  const service: ServiceStub = {
    consultarOportunidade: () => of(DISPONIVEL),
    consultarElegibilidade: () => of(ELEGIVEL),
    registrarInteresse: () => of(INTERESSE),
    cancelarInteresse: () => of(undefined),
    ...overrides,
  };
  return render(OportunidadeDetailPageComponent, {
    providers: [
      provideRouter([]),
      { provide: CredoraService, useValue: service },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ id: OPORTUNIDADE_ID }) } },
      },
    ],
  });
}

describe('OportunidadeDetailPageComponent', () => {
  it('carrega o detalhe DISPONIVEL com valor, taxa e status', async () => {
    const { fixture } = await renderDetail();
    await estabilizar(fixture);

    expect(screen.getByText('Disponivel')).toBeTruthy();
    expect(screen.getByText(/25\.000,00/)).toBeTruthy();
    expect(screen.getByText('2,50% a.m.')).toBeTruthy();
  });

  it('credora elegivel ve a acao de manifestar interesse', async () => {
    const { fixture } = await renderDetail();
    await estabilizar(fixture);

    expect(screen.getByRole('button', { name: 'Manifestar interesse' })).toBeTruthy();
    expect(screen.getByText(/nao gera aporte/)).toBeTruthy();
  });

  it('credora inelegivel nao ve a acao de manifestar', async () => {
    const { fixture } = await renderDetail({
      consultarElegibilidade: () =>
        of({ status: 'CADASTRADA', elegibilidade: 'INELEGIVEL', motivoInelegibilidade: 'PLD' }),
    });
    await estabilizar(fixture);

    expect(screen.queryByRole('button', { name: 'Manifestar interesse' })).toBeNull();
    expect(
      screen.getByText('Sua credora precisa estar ativa e elegivel para manifestar interesse.'),
    ).toBeTruthy();
  });

  it('manifestar interesse com sucesso reflete interesse registrado e oferece cancelar', async () => {
    const { fixture } = await renderDetail();
    await estabilizar(fixture);

    fireEvent.click(screen.getByRole('button', { name: 'Manifestar interesse' }));
    await estabilizar(fixture);

    expect(screen.getByText('Interesse registrado nesta oportunidade.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancelar interesse' })).toBeTruthy();
  });

  it('manifestar com 409 reflete interesse ja registrado', async () => {
    const { fixture } = await renderDetail({
      registrarInteresse: () => throwError(() => erro(409, 'Interesse ativo ja existe')),
    });
    await estabilizar(fixture);

    fireEvent.click(screen.getByRole('button', { name: 'Manifestar interesse' }));
    await estabilizar(fixture);

    expect(screen.getByText('Interesse registrado nesta oportunidade.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancelar interesse' })).toBeTruthy();
  });

  it('manifestar com 422 mostra erro e nao marca interesse', async () => {
    const { fixture } = await renderDetail({
      registrarInteresse: () =>
        throwError(() => erro(422, 'Credora nao elegivel para manifestar interesse')),
    });
    await estabilizar(fixture);

    fireEvent.click(screen.getByRole('button', { name: 'Manifestar interesse' }));
    await estabilizar(fixture);

    expect(screen.getByText('Credora nao elegivel para manifestar interesse')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Manifestar interesse' })).toBeTruthy();
    expect(screen.queryByText('Interesse registrado nesta oportunidade.')).toBeNull();
  });

  it('cancelar interesse com 204 volta a oferecer manifestar', async () => {
    const { fixture } = await renderDetail();
    await estabilizar(fixture);

    fireEvent.click(screen.getByRole('button', { name: 'Manifestar interesse' }));
    await estabilizar(fixture);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar interesse' }));
    await estabilizar(fixture);

    expect(screen.getByRole('button', { name: 'Manifestar interesse' })).toBeTruthy();
    expect(screen.queryByText('Interesse registrado nesta oportunidade.')).toBeNull();
  });

  it('cancelar sem interesse ativo (404) e tratado como sem interesse, sem erro duro', async () => {
    const { fixture } = await renderDetail({
      registrarInteresse: () => throwError(() => erro(409, 'Interesse ativo ja existe')),
      cancelarInteresse: () => throwError(() => erro(404, 'Interesse ativo nao encontrado')),
    });
    await estabilizar(fixture);

    // 409 leva ao estado "interesse registrado" (oferece cancelar).
    fireEvent.click(screen.getByRole('button', { name: 'Manifestar interesse' }));
    await estabilizar(fixture);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar interesse' }));
    await estabilizar(fixture);

    expect(screen.getByRole('button', { name: 'Manifestar interesse' })).toBeTruthy();
    expect(screen.queryByText('Nao foi possivel cancelar o interesse.')).toBeNull();
  });

  it('ENCERRADA avisa que nao aceita interesse e nao mostra acao', async () => {
    const { fixture } = await renderDetail({
      consultarOportunidade: () => of({ ...DISPONIVEL, status: 'ENCERRADA' }),
    });
    await estabilizar(fixture);

    expect(screen.getByText('Encerrada')).toBeTruthy();
    expect(
      screen.getByText('Esta oportunidade esta encerrada e nao aceita manifestacao de interesse.'),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Manifestar interesse' })).toBeNull();
  });

  it('404 mostra oportunidade nao encontrada', async () => {
    const { fixture } = await renderDetail({
      consultarOportunidade: () => throwError(() => erro(404, 'Oportunidade nao encontrada')),
    });
    await estabilizar(fixture);

    expect(screen.getByText('Oportunidade nao encontrada.')).toBeTruthy();
  });
});
