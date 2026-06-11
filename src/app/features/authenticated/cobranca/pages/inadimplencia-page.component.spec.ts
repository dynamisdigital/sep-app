import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { InadimplenciaPageComponent } from './inadimplencia-page.component';

const PARCELA_ATRASADA_ID = 'a0000000-0000-4000-8000-000000000002';

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

function renderPage() {
  return render(InadimplenciaPageComponent, {
    providers: [provideHttpClient(), provideRouter([])],
  });
}

describe('InadimplenciaPageComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('lista parcelas atrasadas e inadimplentes com link para o detalhe', async () => {
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    expect(screen.getByText('Parcela 2')).toBeTruthy();
    expect(screen.getByText('Parcela 6')).toBeTruthy();
    const link = screen.getByText('Parcela 2').closest('a');
    expect(link?.getAttribute('href')).toBe(
      `/app/cobranca/financeiro/parcelas/${PARCELA_ATRASADA_ID}`,
    );
  });

  it('filtra por status enviando o query param e atualizando a lista', async () => {
    const { fixture, container } = await renderPage();
    await estabilizar(fixture);

    const select = container.querySelector('select[formControlName="status"]') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'ATRASADA' } });
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    await estabilizar(fixture);

    expect(screen.getByText('Parcela 2')).toBeTruthy();
    expect(screen.queryByText('Parcela 6')).toBeNull();
  });
});
