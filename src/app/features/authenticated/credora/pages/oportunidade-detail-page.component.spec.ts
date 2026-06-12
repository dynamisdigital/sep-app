import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { Observable, of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { OportunidadeResponse } from '../../../../core/api/api.models';
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

function renderDetail(consultarOportunidade: (id: string) => Observable<OportunidadeResponse>) {
  return render(OportunidadeDetailPageComponent, {
    providers: [
      provideRouter([]),
      { provide: CredoraService, useValue: { consultarOportunidade } },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ id: OPORTUNIDADE_ID }) } },
      },
    ],
  });
}

describe('OportunidadeDetailPageComponent', () => {
  it('carrega o detalhe DISPONIVEL com valor, taxa e status', async () => {
    const { fixture } = await renderDetail(() => of(DISPONIVEL));
    await estabilizar(fixture);

    expect(screen.getByText('Disponivel')).toBeTruthy();
    expect(screen.getByText(/25\.000,00/)).toBeTruthy();
    expect(screen.getByText('2,50% a.m.')).toBeTruthy();
  });

  it('ENCERRADA avisa que nao aceita interesse', async () => {
    const { fixture } = await renderDetail(() => of({ ...DISPONIVEL, status: 'ENCERRADA' }));
    await estabilizar(fixture);

    expect(screen.getByText('Encerrada')).toBeTruthy();
    expect(
      screen.getByText('Esta oportunidade esta encerrada e nao aceita manifestacao de interesse.'),
    ).toBeTruthy();
  });

  it('404 mostra oportunidade nao encontrada', async () => {
    const { fixture } = await renderDetail(() =>
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );
    await estabilizar(fixture);

    expect(screen.getByText('Oportunidade nao encontrada.')).toBeTruthy();
  });
});
