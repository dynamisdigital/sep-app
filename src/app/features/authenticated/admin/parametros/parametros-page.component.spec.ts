import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { resetGovernancaState } from '../../../../../mocks/handlers';
import { server } from '../../../../../mocks/server';
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

  /**
   * Prende a delegacao a `mensagemDeErroDaApi` (F-24.3). Sem este teste, trocar o helper de volta
   * pelo `apiErr?.message ?? padrao` inline nao deixava NENHUM teste vermelho — medido por mutacao,
   * o mesmo diagnostico que originou `api-error-delegacao.spec.ts` na F-22.
   */
  it('erro do backend com message: usa a copy do corpo, nao o literal local', async () => {
    server.use(
      http.get('http://localhost:8080/api/v1/governanca/parametros', () =>
        HttpResponse.json(
          { status: 403, message: 'Perfil sem acesso a parametros.' },
          { status: 403 },
        ),
      ),
    );

    await setup();

    expect(screen.getByText('Perfil sem acesso a parametros.')).toBeTruthy();
  });
});
