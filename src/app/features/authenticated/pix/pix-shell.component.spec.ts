import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { PixShellComponent } from './pix-shell.component';

describe('PixShellComponent', () => {
  it('mostra os cards das operacoes Pix', async () => {
    await render(PixShellComponent, { providers: [provideRouter([])] });

    expect(screen.getByText('Desembolsos')).toBeTruthy();
    expect(screen.getByText('Recebimentos')).toBeTruthy();
    expect(screen.getByText('Divergencias')).toBeTruthy();
  });

  // Desembolsos (F-13.3) e Recebimentos (F-13.4) entraram como cards ativos (link). Divergencias
  // segue desabilitado ate F-13.5: card sem link quebrado.
  it('Desembolsos e um link para /app/pix/desembolsos', async () => {
    await render(PixShellComponent, { providers: [provideRouter([])] });

    expect(screen.getByText('Desembolsos').closest('a')?.getAttribute('href')).toBe(
      '/app/pix/desembolsos',
    );
  });

  it('Recebimentos e um link para /app/pix/recebimentos', async () => {
    await render(PixShellComponent, { providers: [provideRouter([])] });

    expect(screen.getByText('Recebimentos').closest('a')?.getAttribute('href')).toBe(
      '/app/pix/recebimentos',
    );
  });

  it('mantem Divergencias desabilitado ate a sua Task', async () => {
    await render(PixShellComponent, { providers: [provideRouter([])] });

    expect(screen.getAllByText('Disponivel em breve')).toHaveLength(1);
    expect(screen.queryByText('Divergencias')?.closest('a')).toBeNull();
  });
});
