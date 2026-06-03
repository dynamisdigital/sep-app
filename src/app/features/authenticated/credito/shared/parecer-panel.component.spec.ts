import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { ParecerPanelComponent } from './parecer-panel.component';

function parecerFake(scoreMotorSnapshot: number | null) {
  return {
    id: '5f0799c0-98b9-6d9d-bc4a-7d6f5b771d01',
    propostaId: '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c02',
    pareceristaId: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771001',
    decisao: 'PENDENCIA' as const,
    justificativa: 'Aguardando comprovacao de faturamento.',
    scoreMotorSnapshot,
    versao: 1,
    dataParecer: '2026-04-24T18:30:00-03:00',
  };
}

describe('ParecerPanelComponent', () => {
  it('apresenta decisao, versao e justificativa do parecer', async () => {
    await render(ParecerPanelComponent, { inputs: { parecer: parecerFake(720) } });

    expect(screen.getByText('PENDENCIA')).toBeTruthy();
    expect(screen.getByText('Aguardando comprovacao de faturamento.')).toBeTruthy();
    expect(screen.getByText('Score no parecer')).toBeTruthy();
  });

  it('omite score do parecer quando ausente', async () => {
    await render(ParecerPanelComponent, { inputs: { parecer: parecerFake(null) } });

    expect(screen.queryByText('Score no parecer')).toBeNull();
  });
});
