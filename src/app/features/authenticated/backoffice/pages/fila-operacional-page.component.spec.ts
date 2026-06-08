import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { FilaOperacionalPageComponent } from './fila-operacional-page.component';

const ITEM_ABERTO_ID = 'c0000000-0000-4000-8000-000000000001';

interface FilaProbe {
  filtros: { patchValue: (valor: Record<string, unknown>) => void };
  aplicarFiltros: () => void;
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

function renderPagina() {
  return render(FilaOperacionalPageComponent, {
    providers: [provideHttpClient(), provideRouter([])],
  });
}

describe('FilaOperacionalPageComponent', () => {
  it('lista os itens da fila retornados pelo backend', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    expect(screen.getByText('Webhook celcoin/kyc falhou no processamento')).toBeTruthy();
    expect(screen.getByText('Parcela inadimplente ha 35 dias')).toBeTruthy();
  });

  it('liga cada item ao detalhe', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    const link = screen
      .getAllByRole('link')
      .find((a) => a.getAttribute('href') === `/app/backoffice/fila/${ITEM_ABERTO_ID}`);
    expect(link).toBeTruthy();
  });

  it('filtra por status enviando o filtro ao backend', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    const probe = fixture.componentInstance as unknown as FilaProbe;
    probe.filtros.patchValue({ status: 'ABERTO' });
    probe.aplicarFiltros();
    await estabilizar(fixture);

    expect(screen.getByText('Webhook celcoin/kyc falhou no processamento')).toBeTruthy();
    // Item EM_TRATAMENTO some quando o filtro ABERTO e aplicado.
    expect(screen.queryByText('Parcela inadimplente ha 35 dias')).toBeNull();
  });

  it('desabilita a paginacao quando ha uma unica pagina', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    const anterior = screen.getByText('Anterior').closest('button') as HTMLButtonElement;
    const proxima = screen.getByText('Proxima').closest('button') as HTMLButtonElement;
    expect(anterior.disabled).toBe(true);
    expect(proxima.disabled).toBe(true);
  });
});
