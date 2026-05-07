import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it } from 'vitest';

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
});
