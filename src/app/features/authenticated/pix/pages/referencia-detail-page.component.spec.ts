import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { UsuarioRole } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { resetPixState } from '../../../../../mocks/handlers';
import { server } from '../../../../../mocks/server';
import { ReferenciaDetailPageComponent } from './referencia-detail-page.component';
import { estabilizar } from '../../../../../testing/estabilizar';

const REFERENCIA_ATIVA_ID = 'e1000000-0000-4000-8000-000000000001';
const REFERENCIA_INEXISTENTE_ID = 'e1000000-0000-4000-8000-0000000000aa';
const PARCELA_RECEBIVEL_ID = 'a0000000-0000-4000-8000-000000000006';
const REFERENCIAS_URL = 'http://localhost:8080/api/v1/pix/recebimentos/referencias/:id';

function renderDetail(id: string, role: UsuarioRole) {
  return render(ReferenciaDetailPageComponent, {
    providers: [
      provideHttpClient(),
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id }) } } },
      {
        provide: AuthService,
        useValue: { currentUser: () => ({ role, mfaHabilitado: false }) },
      },
    ],
  });
}

describe('ReferenciaDetailPageComponent', () => {
  beforeEach(() => {
    resetPixState();
  });

  it('carrega referencia ATIVA com status, copia-cola e txid', async () => {
    const { fixture } = await renderDetail(REFERENCIA_ATIVA_ID, 'FINANCEIRO');
    await estabilizar(fixture);

    expect(screen.getByText('Ativa')).toBeTruthy();
    expect(screen.getByText(/SEPe1000000/)).toBeTruthy();
    expect(screen.getByText(/br.gov.bcb.pix/)).toBeTruthy();
  });

  it('FINANCEIRO ve a parcela como link para a cobranca', async () => {
    const { fixture } = await renderDetail(REFERENCIA_ATIVA_ID, 'FINANCEIRO');
    await estabilizar(fixture);

    const link = screen.getByText(PARCELA_RECEBIVEL_ID).closest('a');
    expect(link?.getAttribute('href')).toBe(
      `/app/cobranca/financeiro/parcelas/${PARCELA_RECEBIVEL_ID}`,
    );
  });

  it('BACKOFFICE ve o id da parcela como texto, sem link', async () => {
    const { fixture } = await renderDetail(REFERENCIA_ATIVA_ID, 'BACKOFFICE');
    await estabilizar(fixture);

    expect(screen.getByText(PARCELA_RECEBIVEL_ID).closest('a')).toBeNull();
  });

  it('404 mostra referencia nao encontrada', async () => {
    const { fixture } = await renderDetail(REFERENCIA_INEXISTENTE_ID, 'FINANCEIRO');
    await estabilizar(fixture);

    expect(screen.getByText('Referencia nao encontrada.')).toBeTruthy();
  });

  it('referencia DIVERGENTE destaca alerta operacional', async () => {
    server.use(
      http.get(REFERENCIAS_URL, () =>
        HttpResponse.json({
          referenciaId: REFERENCIA_ATIVA_ID,
          parcelaId: PARCELA_RECEBIVEL_ID,
          txid: 'SEPdivergente',
          codigoCopiaCola: '00020126br.gov.bcb.pix',
          valorEsperado: 1000,
          status: 'DIVERGENTE',
          novo: false,
        }),
      ),
    );
    const { fixture } = await renderDetail(REFERENCIA_ATIVA_ID, 'FINANCEIRO');
    await estabilizar(fixture);

    expect(screen.getByText('Divergente')).toBeTruthy();
    expect(screen.getByText(/precisa de tratamento operacional/)).toBeTruthy();
  });
});
