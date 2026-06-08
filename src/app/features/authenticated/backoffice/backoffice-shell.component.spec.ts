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

  // Nesta etapa (C2) as telas das secoes ainda nao foram entregues; os cards ficam
  // desabilitados em vez de apontar para rota inexistente. Cada Task posterior habilita o seu.
  it('mantem as secoes desabilitadas enquanto as telas nao existem', async () => {
    const { container } = await render(BackofficeShellComponent, {
      providers: [provideRouter([])],
    });

    expect(container.querySelectorAll('.sep-backoffice-shell-card-disabled').length).toBe(3);
    expect(container.querySelector('a.sep-backoffice-shell-card')).toBeNull();
  });
});
