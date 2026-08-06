import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { resetGovernancaState } from '../../../../../mocks/handlers';
import { server } from '../../../../../mocks/server';
import { ParametrosPageComponent } from './parametros-page.component';
import { flush } from '../../../../../testing/estabilizar';

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
   * Prende a delegacao a `mensagemDeErroDaApi` (F-24.3). O corpo vem com `message: ''` de proposito:
   * e o unico input que SEPARA as duas implementacoes — delegando, sai o literal local; com o
   * `apiErr?.message ?? padrao` inline de antes, sai `''` e a tela nao renderiza alerta nenhum.
   * Um corpo com mensagem preenchida passaria nos dois e nao provaria a delegacao.
   */
  it('erro com message vazia: cai no literal local em vez de nao renderizar nada', async () => {
    server.use(
      http.get('http://localhost:8080/api/v1/governanca/parametros', () =>
        HttpResponse.json({ status: 500, message: '' }, { status: 500 }),
      ),
    );

    await setup();

    expect(screen.getByText('Nao foi possivel carregar os parametros.')).toBeTruthy();
  });
});
