import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { UserDetailComponent } from './user-detail.component';

async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

function activatedRouteMock(id: string) {
  return {
    snapshot: {
      paramMap: {
        get: (key: string) => (key === 'id' ? id : null),
      },
    },
  };
}

async function setup(id: string) {
  const result = await render(UserDetailComponent, {
    providers: [
      provideRouter([]),
      provideHttpClient(),
      { provide: ActivatedRoute, useValue: activatedRouteMock(id) },
    ],
  });
  await result.fixture.whenStable();
  await flush();
  result.fixture.detectChanges();
  return result;
}

describe('UserDetailComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('carrega usuario do id da rota e renderiza identificacao', async () => {
    await setup('1f0799c0-98b9-6d9d-bc4a-7d6f5b771002');

    expect(screen.getByText('cliente@empresa.com')).toBeTruthy();
    expect(screen.getByText('CLIENTE')).toBeTruthy();
    expect(screen.getByText('1f0799c0-98b9-6d9d-bc4a-7d6f5b771002')).toBeTruthy();
  });

  it('renderiza auditoria do usuario', async () => {
    await setup('1f0799c0-98b9-6d9d-bc4a-7d6f5b771001');

    expect(screen.getByText('Criado em')).toBeTruthy();
    expect(screen.getByText('Modificado em')).toBeTruthy();
    expect(screen.getByText('Criado por')).toBeTruthy();
    expect(screen.getByText('Modificado por')).toBeTruthy();
  });

  it('mostra erro quando id nao existe', async () => {
    await setup('id-inexistente');

    expect(screen.getByRole('alert').textContent).toMatch(/usuario nao encontrado/i);
  });

  it('link voltar aponta para /app/admin/users', async () => {
    await setup('1f0799c0-98b9-6d9d-bc4a-7d6f5b771001');

    const back = screen.getByText(/voltar para lista/i).closest('a');
    expect(back?.getAttribute('href')).toBe('/app/admin/users');
  });
});
