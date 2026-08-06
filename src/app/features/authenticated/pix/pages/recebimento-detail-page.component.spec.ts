import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { UsuarioRole } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { resetPixState } from '../../../../../mocks/handlers';
import { RecebimentoDetailPageComponent } from './recebimento-detail-page.component';
import { estabilizar } from '../../../../../testing/estabilizar';

const RECEBIMENTO_CONCILIADO_ID = 'e2000000-0000-4000-8000-000000000001';
const RECEBIMENTO_NAO_IDENTIFICADO_ID = 'e2000000-0000-4000-8000-000000000002';
const RECEBIMENTO_INEXISTENTE_ID = 'e2000000-0000-4000-8000-0000000000aa';
const REFERENCIA_ATIVA_ID = 'e1000000-0000-4000-8000-000000000001';
const PARCELA_RECEBIVEL_ID = 'a0000000-0000-4000-8000-000000000006';

function renderDetail(id: string, role: UsuarioRole) {
  return render(RecebimentoDetailPageComponent, {
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

describe('RecebimentoDetailPageComponent', () => {
  beforeEach(() => {
    resetPixState();
  });

  it('recebimento CONCILIADO mostra status, referencia e parcela vinculadas', async () => {
    const { fixture } = await renderDetail(RECEBIMENTO_CONCILIADO_ID, 'FINANCEIRO');
    await estabilizar(fixture);

    expect(screen.getByText('Conciliado')).toBeTruthy();
    expect(screen.getByText(REFERENCIA_ATIVA_ID).closest('a')?.getAttribute('href')).toBe(
      `/app/pix/recebimentos/referencias/${REFERENCIA_ATIVA_ID}`,
    );
    expect(screen.getByText(PARCELA_RECEBIVEL_ID).closest('a')?.getAttribute('href')).toBe(
      `/app/cobranca/financeiro/parcelas/${PARCELA_RECEBIVEL_ID}`,
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('recebimento NAO_IDENTIFICADO mostra divergencia sem vinculo de parcela', async () => {
    const { fixture } = await renderDetail(RECEBIMENTO_NAO_IDENTIFICADO_ID, 'FINANCEIRO');
    await estabilizar(fixture);

    expect(screen.getByText('Nao identificado')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toMatch(/nao localizada/i);
    expect(screen.getByText(/sem parcela vinculada/)).toBeTruthy();
  });

  it('404 mostra recebimento nao encontrado', async () => {
    const { fixture } = await renderDetail(RECEBIMENTO_INEXISTENTE_ID, 'FINANCEIRO');
    await estabilizar(fixture);

    expect(screen.getByText('Recebimento nao encontrado.')).toBeTruthy();
  });
});
