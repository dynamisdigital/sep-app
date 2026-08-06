import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { describe, expect, it, vi } from 'vitest';

import { OpenFinancePageComponent } from './open-finance-page.component';
import { estabilizar } from '../../../../../testing/estabilizar';

const PROPOSTA_EM_ANALISE_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c01';
const PROPOSTA_OF_PENDENTE_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c05';
const PROPOSTA_OF_AUTORIZADO_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c06';
const PROPOSTA_SEM_OWNERSHIP_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771ff03';

function activatedRoute(id: string, retorno = false) {
  return { snapshot: { paramMap: convertToParamMap({ id }), data: { retorno } } };
}

function renderPagina(id: string, retorno = false) {
  return render(OpenFinancePageComponent, {
    providers: [
      provideHttpClient(),
      provideRouter([]),
      { provide: ActivatedRoute, useValue: activatedRoute(id, retorno) },
    ],
  });
}

describe('OpenFinancePageComponent', () => {
  it('mostra formulario de inicio quando ainda nao ha consentimento (404)', async () => {
    const { fixture } = await renderPagina(PROPOSTA_EM_ANALISE_ID);
    await estabilizar(fixture);

    expect(screen.getByLabelText('CPF ou CNPJ do titular')).toBeTruthy();
  });

  it('inicia consentimento, faz handoff da URL e atualiza status', async () => {
    const { fixture } = await renderPagina(PROPOSTA_EM_ANALISE_ID);
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);
    await estabilizar(fixture);

    fireEvent.input(screen.getByLabelText('CPF ou CNPJ do titular'), {
      target: { value: '52998224725' },
    });
    fixture.detectChanges();
    fireEvent.click(screen.getByText('Iniciar consentimento'));
    await estabilizar(fixture);

    expect(abrir).toHaveBeenCalledWith(
      'https://provider.openfinance.example/authorize?consent=fake',
      '_blank',
      'noopener',
    );
    abrir.mockRestore();
  });

  it('exibe agregados sanitizados quando AUTORIZADO', async () => {
    const { fixture } = await renderPagina(PROPOSTA_OF_AUTORIZADO_ID);
    await estabilizar(fixture);

    expect(screen.getByText('AUTORIZADO')).toBeTruthy();
    expect(screen.getByText('Movimentacao consolidada')).toBeTruthy();
    expect(screen.getByText('Meses avaliados')).toBeTruthy();
  });

  it('exibe status PENDENTE existente sem oferecer novo formulario', async () => {
    const { fixture } = await renderPagina(PROPOSTA_OF_PENDENTE_ID);
    await estabilizar(fixture);

    expect(screen.getByText('PENDENTE')).toBeTruthy();
    expect(screen.queryByLabelText('CPF ou CNPJ do titular')).toBeNull();
  });

  it('exibe orientacao de retorno na rota de retorno', async () => {
    const { fixture } = await renderPagina(PROPOSTA_OF_AUTORIZADO_ID, true);
    await estabilizar(fixture);

    expect(screen.getByText(/Voce voltou da autorizacao/)).toBeTruthy();
  });

  it('mostra erro quando a proposta e de outro dono (403)', async () => {
    const { fixture } = await renderPagina(PROPOSTA_SEM_OWNERSHIP_ID);
    await estabilizar(fixture);

    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
