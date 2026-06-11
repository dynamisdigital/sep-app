import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { CreditoHomeComponent } from './credito-home.component';

describe('CreditoHomeComponent', () => {
  it('apresenta os atalhos de propostas e nova proposta', async () => {
    await render(CreditoHomeComponent, { providers: [provideRouter([])] });

    expect(screen.getByText('Minhas propostas')).toBeTruthy();
    expect(screen.getByText('Nova proposta')).toBeTruthy();
  });

  it('liga os atalhos para as rotas de proposta', async () => {
    await render(CreditoHomeComponent, { providers: [provideRouter([])] });

    const listaLink = screen.getByText('Minhas propostas').closest('a');
    const novaLink = screen.getByText('Nova proposta').closest('a');
    expect(listaLink?.getAttribute('href')).toBe('/app/credito/propostas');
    expect(novaLink?.getAttribute('href')).toBe('/app/credito/propostas/nova');
  });
});
