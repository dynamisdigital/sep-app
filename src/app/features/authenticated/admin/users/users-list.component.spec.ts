import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { server } from '../../../../../mocks/server';
import { UsersListComponent } from './users-list.component';

async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

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
   * Prende a delegacao a `mensagemDeErroDaApi` (F-24.3). Sem este teste, trocar o helper de volta
   * pelo `apiErr?.message ?? padrao` inline nao deixava NENHUM teste vermelho — medido por mutacao,
   * o mesmo diagnostico que originou `api-error-delegacao.spec.ts` na F-22.
   */
  it('erro do backend com message: usa a copy do corpo, nao o literal local', async () => {
    server.use(
      http.get('http://localhost:8080/api/v1/usuarios', () =>
        HttpResponse.json(
          { status: 403, message: 'Perfil sem acesso a usuarios.' },
          { status: 403 },
        ),
      ),
    );

    await setup();

    expect(screen.getByText('Perfil sem acesso a usuarios.')).toBeTruthy();
  });
});
