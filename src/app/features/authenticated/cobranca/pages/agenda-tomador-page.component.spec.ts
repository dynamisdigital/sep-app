import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { AgendaTomadorPageComponent } from './agenda-tomador-page.component';

const CONTRATO_COM_AGENDA_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e03';
const CONTRATO_SEM_AGENDA_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771beef';

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

function renderAgenda(contratoId: string) {
  return render(AgendaTomadorPageComponent, {
    providers: [
      provideHttpClient(),
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ contratoId }) } },
      },
    ],
  });
}

describe('AgendaTomadorPageComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('carrega a agenda e renderiza as parcelas com status e total', async () => {
    const { fixture } = await renderAgenda(CONTRATO_COM_AGENDA_ID);
    await estabilizar(fixture);

    expect(screen.getByText('Agenda de cobranca')).toBeTruthy();
    expect(screen.getByText('Parcela 1')).toBeTruthy();
    expect(screen.getByText('Pendente')).toBeTruthy();
    expect(screen.getByText('Atrasada')).toBeTruthy();
    expect(screen.getByText('Paga')).toBeTruthy();
  });

  it('cada parcela aponta para o detalhe', async () => {
    const { fixture } = await renderAgenda(CONTRATO_COM_AGENDA_ID);
    await estabilizar(fixture);

    const link = screen.getByText('Parcela 1').closest('a');
    expect(link?.getAttribute('href')).toBe(
      '/app/cobranca/parcelas/a0000000-0000-4000-8000-000000000001',
    );
  });

  it('mostra estado indisponivel quando a agenda nao existe (404)', async () => {
    const { fixture } = await renderAgenda(CONTRATO_SEM_AGENDA_ID);
    await estabilizar(fixture);

    expect(screen.getByText(/Agenda em geracao ou indisponivel/)).toBeTruthy();
  });
});
