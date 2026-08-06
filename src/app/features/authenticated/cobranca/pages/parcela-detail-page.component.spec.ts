import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { ParcelaDetailPageComponent } from './parcela-detail-page.component';
import { estabilizar } from '../../../../../testing/estabilizar';

const PARCELA_ATRASADA_ID = 'a0000000-0000-4000-8000-000000000002';
const PARCELA_EM_NEGOCIACAO_ID = 'a0000000-0000-4000-8000-000000000008';
const PARCELA_INEXISTENTE_ID = 'a0000000-0000-4000-8000-0000000000aa';

function renderParcela(id: string) {
  return render(ParcelaDetailPageComponent, {
    providers: [
      provideHttpClient(),
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id }) } } },
    ],
  });
}

describe('ParcelaDetailPageComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('exibe a composicao atualizada com mora/multa e saldo do backend', async () => {
    const { fixture } = await renderParcela(PARCELA_ATRASADA_ID);
    await estabilizar(fixture);

    expect(screen.getByText('Parcela 2')).toBeTruthy();
    expect(screen.getByText('Atrasada')).toBeTruthy();
    expect(screen.getByText('Juros de mora')).toBeTruthy();
    expect(screen.getByText('Valor devido atualizado')).toBeTruthy();
    expect(screen.getByText('Valor em aberto')).toBeTruthy();
  });

  it('mostra estado nao encontrada quando a parcela nao existe (404)', async () => {
    const { fixture } = await renderParcela(PARCELA_INEXISTENTE_ID);
    await estabilizar(fixture);

    expect(screen.getByText('Parcela nao encontrada.')).toBeTruthy();
  });

  it('exibe o CTA da proposta apenas quando a parcela esta EM_NEGOCIACAO', async () => {
    const { fixture } = await renderParcela(PARCELA_EM_NEGOCIACAO_ID);
    await estabilizar(fixture);

    const cta = screen.getByRole('link', { name: /Ver proposta de renegociacao/ });
    expect(cta.getAttribute('href')).toBe(
      `/app/cobranca/parcelas/${PARCELA_EM_NEGOCIACAO_ID}/renegociacao`,
    );
  });

  it('nao exibe o CTA da proposta para outros status', async () => {
    const { fixture } = await renderParcela(PARCELA_ATRASADA_ID);
    await estabilizar(fixture);

    expect(screen.queryByRole('link', { name: /Ver proposta de renegociacao/ })).toBeNull();
  });
});
