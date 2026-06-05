import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { ParcelaDetailPageComponent } from './parcela-detail-page.component';

const PARCELA_ATRASADA_ID = 'a0000000-0000-4000-8000-000000000002';
const PARCELA_INEXISTENTE_ID = 'a0000000-0000-4000-8000-0000000000aa';

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

function renderParcela(id: string) {
  return render(ParcelaDetailPageComponent, {
    providers: [
      provideHttpClient(),
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id }) } } },
    ],
  });
}

describe('ParcelaDetailPageComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('exibe a composicao atualizada com mora/multa e saldo do backend', async () => {
    const { fixture } = await renderParcela(PARCELA_ATRASADA_ID);
    await estabilizar(fixture);

    expect(screen.getByText('Parcela 2')).toBeTruthy();
    expect(screen.getByText('Atrasada')).toBeTruthy();
    expect(screen.getByText('Juros de mora')).toBeTruthy();
    expect(screen.getByText('Valor devido atualizado')).toBeTruthy();
    expect(screen.getByText('Valor em aberto')).toBeTruthy();
  });

  it('mostra estado nao encontrada quando a parcela nao existe (404)', async () => {
    const { fixture } = await renderParcela(PARCELA_INEXISTENTE_ID);
    await estabilizar(fixture);

    expect(screen.getByText('Parcela nao encontrada.')).toBeTruthy();
  });
});
