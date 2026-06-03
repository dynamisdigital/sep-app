import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { ContratoDetailComponent } from './contrato-detail.component';

const CONTRATO_AGUARDANDO_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e01';
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

  it('exibe status e metadados do contrato', async () => {
    const { fixture } = await renderDetail(CONTRATO_AGUARDANDO_ID);
    await estabilizar(fixture);

    expect(screen.getByText('Aguardando aceite')).toBeTruthy();
    expect(screen.getByText('Versao vigente')).toBeTruthy();
  });

  it('exibe mensagem de erro quando o contrato nao existe (404)', async () => {
    const { fixture } = await renderDetail(CONTRATO_INEXISTENTE_ID);
    await estabilizar(fixture);

    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
