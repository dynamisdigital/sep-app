import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { server } from '../../../../../mocks/server';
import { UsersListComponent } from './users-list.component';
import { flush } from '../../../../../testing/estabilizar';

async function setup() {
  const result = await render(UsersListComponent, {
    providers: [provideRouter([]), provideHttpClient()],
  });
  await result.fixture.whenStable();
  await flush();
  result.fixture.detectChanges();
  return result;
}

describe('UsersListComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('carrega usuarios e renderiza tabela', async () => {
    await setup();

    expect(screen.getByText('admin@empresa.com')).toBeTruthy();
    expect(screen.getByText('cliente@empresa.com')).toBeTruthy();
    expect(screen.getByText('ADMIN')).toBeTruthy();
    expect(screen.getByText('CLIENTE')).toBeTruthy();
  });

  it('filtro local por e-mail reduz a lista', async () => {
    const result = await setup();

    fireEvent.input(screen.getByLabelText(/filtrar por e-mail/i), {
      target: { value: 'admin' },
    });
    result.fixture.detectChanges();

    expect(screen.getByText('admin@empresa.com')).toBeTruthy();
    expect(screen.queryByText('cliente@empresa.com')).toBeNull();
  });

  it('estado vazio aparece quando filtro nao encontra', async () => {
    const result = await setup();

    fireEvent.input(screen.getByLabelText(/filtrar por e-mail/i), {
      target: { value: 'inexistente' },
    });
    result.fixture.detectChanges();

    expect(screen.getByText(/nenhum usuario encontrado/i)).toBeTruthy();
  });

  it('link de detalhe aponta para /app/admin/users/{id}', async () => {
    await setup();

    const links = screen.getAllByRole('link', { name: /ver detalhe/i });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0].getAttribute('href')).toMatch(/^\/app\/admin\/users\//);
  });

  /**
   * Prende a delegacao a `mensagemDeErroDaApi` (F-24.3). O corpo vem com `message: ''` de proposito:
   * e o unico input que SEPARA as duas implementacoes — delegando, sai o literal local; com o
   * `apiErr?.message ?? padrao` inline de antes, sai `''` e a tela nao renderiza alerta nenhum.
   * Um corpo com mensagem preenchida passaria nos dois e nao provaria a delegacao.
   */
  it('erro com message vazia: cai no literal local em vez de nao renderizar nada', async () => {
    server.use(
      http.get('http://localhost:8080/api/v1/usuarios', () =>
        HttpResponse.json({ status: 500, message: '' }, { status: 500 }),
      ),
    );

    await setup();

    expect(screen.getByText('Nao foi possivel carregar os usuarios.')).toBeTruthy();
  });
});
