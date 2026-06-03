import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { PropostaStatusComponent } from './proposta-status.component';

describe('PropostaStatusComponent', () => {
  it('exibe label e variante aprovado', async () => {
    await render(PropostaStatusComponent, { inputs: { status: 'APROVADA' } });

    expect(screen.getByText('Aprovada').className).toContain('is-aprovado');
  });

  it('exibe variante reprovado para REJEITADA', async () => {
    await render(PropostaStatusComponent, { inputs: { status: 'REJEITADA' } });

    expect(screen.getByText('Rejeitada').className).toContain('is-reprovado');
  });

  it('exibe variante andamento para EM_ANALISE', async () => {
    await render(PropostaStatusComponent, { inputs: { status: 'EM_ANALISE' } });

    expect(screen.getByText('Em analise').className).toContain('is-andamento');
  });

  it('exibe variante pre para PRE_APROVADA', async () => {
    await render(PropostaStatusComponent, { inputs: { status: 'PRE_APROVADA' } });

    expect(screen.getByText('Pre-aprovada').className).toContain('is-pre');
  });

  it('exibe variante pendente para PENDENCIA', async () => {
    await render(PropostaStatusComponent, { inputs: { status: 'PENDENCIA' } });

    expect(screen.getByText('Pendencia').className).toContain('is-pendente');
  });
});
