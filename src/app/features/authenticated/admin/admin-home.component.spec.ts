import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { AdminHomeComponent } from './admin-home.component';

describe('AdminHomeComponent', () => {
  it('mostra os cards de Usuários e Parâmetros operacionais', async () => {
    await render(AdminHomeComponent, { providers: [provideRouter([])] });

    expect(screen.getByText('Usuários')).toBeTruthy();
    expect(screen.getByText('Parâmetros operacionais')).toBeTruthy();
  });

  it('Usuários é um link para /app/admin/users', async () => {
    await render(AdminHomeComponent, { providers: [provideRouter([])] });

    const link = screen.getByText('Usuários').closest('a');
    expect(link?.getAttribute('href')).toBe('/app/admin/users');
  });

  it('Parâmetros operacionais é um link para /app/admin/parametros', async () => {
    await render(AdminHomeComponent, { providers: [provideRouter([])] });

    const link = screen.getByText('Parâmetros operacionais').closest('a');
    expect(link?.getAttribute('href')).toBe('/app/admin/parametros');
  });
});
