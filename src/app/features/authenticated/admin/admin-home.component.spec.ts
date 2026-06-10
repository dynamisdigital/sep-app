import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { AdminHomeComponent } from './admin-home.component';

describe('AdminHomeComponent', () => {
  it('mostra os cards de Usuarios e Parametros operacionais', async () => {
    await render(AdminHomeComponent, { providers: [provideRouter([])] });

    expect(screen.getByText('Usuarios')).toBeTruthy();
    expect(screen.getByText('Parametros operacionais')).toBeTruthy();
  });

  it('Usuarios e um link para /app/admin/users', async () => {
    await render(AdminHomeComponent, { providers: [provideRouter([])] });

    const link = screen.getByText('Usuarios').closest('a');
    expect(link?.getAttribute('href')).toBe('/app/admin/users');
  });

  it('Parametros operacionais fica desabilitado (sem link) ate F-12.4', async () => {
    await render(AdminHomeComponent, { providers: [provideRouter([])] });

    const card = screen.getByText('Parametros operacionais').closest('a');
    expect(card).toBeNull();
    expect(screen.getByText('Disponivel em breve')).toBeTruthy();
  });
});
