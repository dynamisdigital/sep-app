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

  // Desembolsos entrou em F-13.3 como card ativo (link). Recebimentos e Divergencias seguem
  // desabilitados ate F-13.4/F-13.5: cards sem link quebrado.
  it('Desembolsos e um link para /app/pix/desembolsos', async () => {
    await render(PixShellComponent, { providers: [provideRouter([])] });

    expect(screen.getByText('Desembolsos').closest('a')?.getAttribute('href')).toBe(
      '/app/pix/desembolsos',
    );
  });

  it('mantem Recebimentos e Divergencias desabilitados ate suas Tasks', async () => {
    await render(PixShellComponent, { providers: [provideRouter([])] });

    expect(screen.getAllByText('Disponivel em breve')).toHaveLength(2);
    expect(screen.queryByText('Recebimentos')?.closest('a')).toBeNull();
    expect(screen.queryByText('Divergencias')?.closest('a')).toBeNull();
  });
});
