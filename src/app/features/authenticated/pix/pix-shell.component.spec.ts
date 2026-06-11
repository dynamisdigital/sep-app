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

  // Apos F-13.5 as tres operacoes Pix (Desembolsos, Recebimentos, Divergencias) sao cards ativos.
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

  it('Divergencias e um link para /app/pix/divergencias', async () => {
    await render(PixShellComponent, { providers: [provideRouter([])] });

    expect(screen.getByText('Divergencias').closest('a')?.getAttribute('href')).toBe(
      '/app/pix/divergencias',
    );
  });

  it('nao ha mais cards desabilitados', async () => {
    await render(PixShellComponent, { providers: [provideRouter([])] });

    expect(screen.queryByText('Disponivel em breve')).toBeNull();
  });
});
