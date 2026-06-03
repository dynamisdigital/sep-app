import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { ScorePanelComponent } from './score-panel.component';

describe('ScorePanelComponent', () => {
  it('apresenta o score do motor como informativo', async () => {
    await render(ScorePanelComponent, {
      inputs: {
        score: {
          valor: 720,
          statusSugerido: 'PRE_APROVADA',
          falhas: 0,
          pendencias: 1,
          dataCalculo: '2026-04-24T18:30:00-03:00',
        },
      },
    });

    expect(screen.getByText('Score')).toBeTruthy();
    expect(screen.getByText('720')).toBeTruthy();
    expect(screen.getByText('Pre-aprovada')).toBeTruthy();
  });
});
