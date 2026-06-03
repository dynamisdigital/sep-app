import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { OnboardingStatusComponent } from './onboarding-status.component';

describe('OnboardingStatusComponent', () => {
  it('exibe o status com a variante aprovado', async () => {
    await render(OnboardingStatusComponent, { inputs: { status: 'APROVADO_FINAL' } });

    const badge = screen.getByText('APROVADO_FINAL');
    expect(badge.className).toContain('is-aprovado');
  });

  it('exibe o status com a variante reprovado', async () => {
    await render(OnboardingStatusComponent, { inputs: { status: 'REPROVADO_PLD' } });

    expect(screen.getByText('REPROVADO_PLD').className).toContain('is-reprovado');
  });

  it('exibe a variante andamento para estados intermediarios', async () => {
    await render(OnboardingStatusComponent, { inputs: { status: 'EM_VERIFICACAO' } });

    expect(screen.getByText('EM_VERIFICACAO').className).toContain('is-andamento');
  });

  it('mostra a linha de resultado com motivo quando presente', async () => {
    await render(OnboardingStatusComponent, {
      inputs: {
        status: 'REPROVADO',
        resultado: {
          statusFinal: 'REPROVADO',
          motivo: 'Documento ilegivel',
          dataResultado: '2026-04-24T18:30:00-03:00',
        },
      },
    });

    expect(screen.getByText(/Resultado: REPROVADO/)).toBeTruthy();
    expect(screen.getByText(/Documento ilegivel/)).toBeTruthy();
  });
});
