import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { ParcelaStatusComponent } from './parcela-status.component';

// Garante que a base 'sep-parcela-status-badge' e a variante 'is-*' coexistem: o SCSS
// usa '&.is-*' (precisa das duas classes). Angular 20 mescla 'class' estatico com o
// binding [class] string quando nao ha colisao de nomes.
describe('ParcelaStatusComponent', () => {
  it('aplica label, classe base e variante para PAGA', async () => {
    await render(ParcelaStatusComponent, { inputs: { status: 'PAGA' } });

    const badge = screen.getByText('Paga');
    expect(badge.className).toContain('sep-parcela-status-badge');
    expect(badge.className).toContain('is-pago');
  });

  it('mapeia INADIMPLENTE para a variante grave', async () => {
    await render(ParcelaStatusComponent, { inputs: { status: 'INADIMPLENTE' } });

    const badge = screen.getByText('Inadimplente');
    expect(badge.className).toContain('sep-parcela-status-badge');
    expect(badge.className).toContain('is-grave');
  });
});
