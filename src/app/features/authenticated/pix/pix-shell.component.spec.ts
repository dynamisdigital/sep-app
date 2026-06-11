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

  // Em F-13.2 as operacoes ainda nao tem rota (entram em F-13.3/F-13.4/F-13.5): os cards
  // aparecem desabilitados, sem link quebrado.
  it('apresenta as operacoes como desabilitadas enquanto a rota nao foi entregue', async () => {
    await render(PixShellComponent, { providers: [provideRouter([])] });

    expect(screen.getAllByText('Disponivel em breve')).toHaveLength(3);
    expect(screen.queryByText('Desembolsos')?.closest('a')).toBeNull();
  });
});
