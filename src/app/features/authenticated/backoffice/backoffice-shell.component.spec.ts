import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { BackofficeShellComponent } from './backoffice-shell.component';

describe('BackofficeShellComponent', () => {
  it('apresenta o titulo e as tres secoes operacionais', async () => {
    await render(BackofficeShellComponent, { providers: [provideRouter([])] });

    expect(screen.getByText('Backoffice')).toBeTruthy();
    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.getByText('Fila operacional')).toBeTruthy();
    expect(screen.getByText('Reprocessos')).toBeTruthy();
  });

  // Cada Task habilita o card da sua tela. Apos F-10.3 o Dashboard e navegavel; fila e
  // reprocessos seguem desabilitados ate F-10.4/F-10.6.
  it('habilita o card Dashboard e mantem fila/reprocessos desabilitados', async () => {
    const { container } = await render(BackofficeShellComponent, {
      providers: [provideRouter([])],
    });

    const dashboard = screen.getByText('Dashboard').closest('a');
    expect(dashboard?.getAttribute('href')).toBe('/app/backoffice/dashboard');
    expect(container.querySelectorAll('.sep-backoffice-shell-card-disabled').length).toBe(2);
  });
});
