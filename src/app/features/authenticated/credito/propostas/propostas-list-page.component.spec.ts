import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { PropostasListPageComponent } from './propostas-list-page.component';

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
  return render(PropostasListPageComponent, {
    providers: [provideHttpClient(), provideRouter([])],
  });
}

describe('PropostasListPageComponent', () => {
  it('lista as propostas do tomador retornadas pela API', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    expect(screen.getByText('Em analise')).toBeTruthy();
    expect(screen.getByText('Pre-aprovada')).toBeTruthy();
    expect(screen.getByText('Aprovada')).toBeTruthy();
    expect(screen.getByText('Pendencia')).toBeTruthy();
  });

  it('liga cada linha ao detalhe da proposta', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    const link = screen.getAllByRole('link').find((a) => a.textContent?.trim() === '5b771c01');
    expect(link?.getAttribute('href')).toBe(
      '/app/credito/propostas/3f0799c0-98b9-6d9d-bc4a-7d6f5b771c01',
    );
  });

  it('mostra atalho para nova proposta', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    const nova = screen.getByText('Nova proposta').closest('a');
    expect(nova?.getAttribute('href')).toBe('/app/credito/propostas/nova');
  });
});
