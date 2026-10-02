import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { Observable, of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { OportunidadeResponse } from '../../../../core/api/api.models';
import { CredoraService } from '../../../../core/credora/credora.service';
import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';
import { OportunidadesPageComponent } from './oportunidades-page.component';

const DISPONIVEL: OportunidadeResponse = {
  id: '7f0799c0-98b9-6d9d-bc4a-7d6f5b78b001',
  propostaId: 'p-1',
  contratoId: 'c-1',
  valor: 6000,
  prazoMeses: 10,
  taxaJurosMensal: 0.025,
  status: 'DISPONIVEL',
  dataCriacao: '2026-05-28T12:00:00-03:00',
};

const DISPONIVEL_2: OportunidadeResponse = {
  ...DISPONIVEL,
  id: '7f0799c0-98b9-6d9d-bc4a-7d6f5b78b002',
  valor: 4625,
  taxaJurosMensal: 0.019,
};

const ENCERRADA: OportunidadeResponse = {
  ...DISPONIVEL,
  id: '7f0799c0-98b9-6d9d-bc4a-7d6f5b78b003',
  valor: 3125,
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
    providers: [
      provideRouter([]),
      provideHttpClient(),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      { provide: CredoraService, useValue: { listarOportunidades } },
    ],
  });
}

describe('OportunidadesPageComponent', () => {
  it('lista oportunidades e linka DISPONIVEL ao detalhe', async () => {
    const { fixture } = await renderPagina(() => of([DISPONIVEL]));
    await estabilizar(fixture);

    expect(screen.getAllByText('Disponível').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/6\.000,00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('2,50% a.m.').length).toBeGreaterThan(0);
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

  // Os agregados do topo saem da propria lista devolvida e ignoram as encerradas, para os numeros
  // da tela fecharem entre si.
  it('agregados somam apenas as oportunidades disponiveis', async () => {
    const { fixture } = await renderPagina(() => of([DISPONIVEL, DISPONIVEL_2, ENCERRADA]));
    await estabilizar(fixture);

    expect(screen.getByText(/10\.625,00/)).toBeTruthy();
    expect(screen.getByText('10 meses', { selector: 'strong' })).toBeTruthy();
    expect(screen.getByText('2,20% a.m.')).toBeTruthy();
  });

  it('estado vazio quando nao ha oportunidades', async () => {
    const { fixture } = await renderPagina(() => of([]));
    await estabilizar(fixture);

    expect(screen.getByText('Não há oportunidades disponíveis no momento.')).toBeTruthy();
  });

  it('erro mostra mensagem e acao de tentar novamente', async () => {
    const { fixture } = await renderPagina(() =>
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    await estabilizar(fixture);

    expect(screen.getByText('Não foi possível carregar as oportunidades.')).toBeTruthy();
    expect(screen.getByText('Tentar novamente')).toBeTruthy();
  });
});
