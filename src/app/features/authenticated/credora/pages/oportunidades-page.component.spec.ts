import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { Observable, of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { OportunidadeResponse } from '../../../../core/api/api.models';
import { CredoraService } from '../../../../core/credora/credora.service';
import { OportunidadesPageComponent } from './oportunidades-page.component';

const DISPONIVEL: OportunidadeResponse = {
  id: '7f0799c0-98b9-6d9d-bc4a-7d6f5b78b001',
  propostaId: 'p-1',
  contratoId: 'c-1',
  valor: 25000,
  prazoMeses: 12,
  taxaJurosMensal: 0.025,
  status: 'DISPONIVEL',
  dataCriacao: '2026-05-28T12:00:00-03:00',
};

const ENCERRADA: OportunidadeResponse = {
  ...DISPONIVEL,
  id: '7f0799c0-98b9-6d9d-bc4a-7d6f5b78b003',
  status: 'ENCERRADA',
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

function renderPagina(listarOportunidades: () => Observable<OportunidadeResponse[]>) {
  return render(OportunidadesPageComponent, {
    providers: [provideRouter([]), { provide: CredoraService, useValue: { listarOportunidades } }],
  });
}

describe('OportunidadesPageComponent', () => {
  it('lista oportunidades e linka DISPONIVEL ao detalhe', async () => {
    const { fixture } = await renderPagina(() => of([DISPONIVEL]));
    await estabilizar(fixture);

    expect(screen.getByText('Disponivel')).toBeTruthy();
    expect(screen.getByText(/25\.000,00/)).toBeTruthy();
    expect(screen.getByText('2,50% a.m.')).toBeTruthy();
    expect(screen.getByText('5b78b001').closest('a')?.getAttribute('href')).toBe(
      '/app/credora/oportunidades/7f0799c0-98b9-6d9d-bc4a-7d6f5b78b001',
    );
  });

  it('ENCERRADA aparece sem link de detalhe', async () => {
    const { fixture } = await renderPagina(() => of([ENCERRADA]));
    await estabilizar(fixture);

    expect(screen.getByText('Encerrada')).toBeTruthy();
    expect(screen.getByText('5b78b003').closest('a')).toBeNull();
  });

  it('estado vazio quando nao ha oportunidades', async () => {
    const { fixture } = await renderPagina(() => of([]));
    await estabilizar(fixture);

    expect(screen.getByText('Nao ha oportunidades disponiveis no momento.')).toBeTruthy();
  });

  it('erro mostra mensagem e acao de tentar novamente', async () => {
    const { fixture } = await renderPagina(() =>
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    await estabilizar(fixture);

    expect(screen.getByText('Nao foi possivel carregar as oportunidades.')).toBeTruthy();
    expect(screen.getByText('Tentar novamente')).toBeTruthy();
  });
});
