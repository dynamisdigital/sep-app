import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { resetGovernancaState } from '../../../../../mocks/handlers';
import { ParametrosPageComponent } from './parametros-page.component';

async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

async function setup() {
  const result = await render(ParametrosPageComponent, {
    providers: [provideRouter([]), provideHttpClient()],
  });
  await result.fixture.whenStable();
  await flush();
  result.fixture.detectChanges();
  return result;
}

describe('ParametrosPageComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetGovernancaState();
  });

  it('lista os parametros do seed com tipos variados', async () => {
    await setup();

    expect(screen.getByText('credito.valor.maximo.pf')).toBeTruthy();
    expect(screen.getByText('credito.prazo.maximo.pf.meses')).toBeTruthy();
    expect(screen.getByText('credito.score.pre-aprovacao')).toBeTruthy();
  });

  it('cada parametro tem link para o detalhe por chave', async () => {
    await setup();

    const link = screen.getByText('credito.valor.maximo.pf').closest('tr')?.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/app/admin/parametros/credito.valor.maximo.pf');
  });
});
