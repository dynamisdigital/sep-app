import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { PropostaEntryComponent } from './proposta-entry.component';
import { estabilizar } from '../../../../testing/estabilizar';

const PROPOSTA_APROVADA_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c03';
const PROPOSTA_SEM_CONTRATO_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c02';
const CONTRATO_AGUARDANDO_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e01';

function activatedRoute(propostaId: string) {
  return { snapshot: { paramMap: convertToParamMap({ propostaId }) } };
}

function renderEntry(propostaId: string) {
  return render(PropostaEntryComponent, {
    providers: [
      provideHttpClient(),
      provideRouter([]),
      { provide: ActivatedRoute, useValue: activatedRoute(propostaId) },
    ],
  });
}

describe('PropostaEntryComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('resolve o contrato da proposta e oferece acesso ao detalhe', async () => {
    const { fixture } = await renderEntry(PROPOSTA_APROVADA_ID);
    await estabilizar(fixture);

    expect(screen.getByText('Aguardando aceite')).toBeTruthy();
    const cta = screen.getByText('Ver contrato').closest('a');
    expect(cta?.getAttribute('href')).toBe(`/app/formalizacao/contratos/${CONTRATO_AGUARDANDO_ID}`);
  });

  it('mostra estado "contrato nao gerado" quando a proposta nao tem contrato (404)', async () => {
    const { fixture } = await renderEntry(PROPOSTA_SEM_CONTRATO_ID);
    await estabilizar(fixture);

    expect(screen.getByText(/ainda nao foi gerado/)).toBeTruthy();
  });
});
