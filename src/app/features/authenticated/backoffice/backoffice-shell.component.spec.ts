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

  // Apos F-10.6 as tres secoes sao navegaveis (nenhum card desabilitado).
  it('deixa Dashboard, Fila e Reprocessos navegaveis', async () => {
    const { container } = await render(BackofficeShellComponent, {
      providers: [provideRouter([])],
    });

    expect(screen.getByText('Dashboard').closest('a')?.getAttribute('href')).toBe(
      '/app/backoffice/dashboard',
    );
    expect(screen.getByText('Fila operacional').closest('a')?.getAttribute('href')).toBe(
      '/app/backoffice/fila',
    );
    expect(screen.getByText('Reprocessos').closest('a')?.getAttribute('href')).toBe(
      '/app/backoffice/reprocessos',
    );
    expect(container.querySelectorAll('.sep-backoffice-shell-card-disabled').length).toBe(0);
  });
});
