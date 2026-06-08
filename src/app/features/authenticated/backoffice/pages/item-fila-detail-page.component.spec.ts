import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { ItemFilaDetailPageComponent } from './item-fila-detail-page.component';

const ITEM_EM_TRATAMENTO_ID = 'c0000000-0000-4000-8000-000000000002';
const ITEM_INEXISTENTE_ID = 'c0000000-0000-4000-8000-0000000000aa';

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

function activatedRoute(id?: string) {
  return { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } };
}

function renderPagina(id?: string) {
  return render(ItemFilaDetailPageComponent, {
    providers: [
      provideHttpClient(),
      provideRouter([]),
      { provide: ActivatedRoute, useValue: activatedRoute(id) },
    ],
  });
}

describe('ItemFilaDetailPageComponent', () => {
  it('mostra titulo, objeto original e comentarios', async () => {
    const { fixture } = await renderPagina(ITEM_EM_TRATAMENTO_ID);
    await estabilizar(fixture);

    expect(screen.getByText('Parcela inadimplente ha 35 dias')).toBeTruthy();
    expect(screen.getByText('Parcela 3/12 vencida')).toBeTruthy();
    expect(screen.getByText('Tomador contatado; aguardando comprovante.')).toBeTruthy();
  });

  it('mostra "Item nao encontrado" para id inexistente (404)', async () => {
    const { fixture } = await renderPagina(ITEM_INEXISTENTE_ID);
    await estabilizar(fixture);

    expect(screen.getByText('Item nao encontrado.')).toBeTruthy();
  });
});
