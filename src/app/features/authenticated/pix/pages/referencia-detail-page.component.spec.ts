import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { UsuarioRole } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';
import { resetPixState } from '../../../../../mocks/handlers';
import { server } from '../../../../../mocks/server';
import { ReferenciaDetailPageComponent } from './referencia-detail-page.component';

const REFERENCIA_ATIVA_ID = 'e1000000-0000-4000-8000-000000000001';
const REFERENCIA_INEXISTENTE_ID = 'e1000000-0000-4000-8000-0000000000aa';
const REFERENCIAS_URL = 'http://localhost:8080/api/v1/pix/recebimentos/referencias/:id';

async function flush(times = 6): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

async function estabilizar(fixture: ComponentFixture<unknown>): Promise<void> {
  await fixture.whenStable();
  await flush();
  fixture.detectChanges();
}

function renderDetail(id: string, role: UsuarioRole) {
  return render(ReferenciaDetailPageComponent, {
    providers: [
      provideHttpClient(),
      provideRouter([]),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id }) } } },
      {
        provide: AuthService,
        useValue: {
          currentUser: () => ({ username: 'admin@empresa.com', role, mfaHabilitado: false }),
        },
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

    expect(screen.getByRole('heading', { name: /Referência 00000001/ })).toBeTruthy();
    expect(screen.getAllByText('Ativa').length).toBeGreaterThan(0);
    expect(screen.getByText(/SEPe1000000/)).toBeTruthy();
    expect(screen.getByText(/br.gov.bcb.pix/)).toBeTruthy();
  });

  it('exibe tabela de recebimentos vinculados', async () => {
    const { fixture } = await renderDetail(REFERENCIA_ATIVA_ID, 'FINANCEIRO');
    await estabilizar(fixture);

    expect(screen.getByRole('heading', { name: /Recebimentos vinculados/ })).toBeTruthy();
    expect(screen.getByText('e2000000-0000-4000-8000-000000000001')).toBeTruthy();
  });

  it('exibe linha do tempo e ações rápidas', async () => {
    const { fixture } = await renderDetail(REFERENCIA_ATIVA_ID, 'FINANCEIRO');
    await estabilizar(fixture);

    expect(screen.getByRole('heading', { name: /Linha do tempo/ })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Ações rápidas/ })).toBeTruthy();
    expect(screen.getByText('Referência criada')).toBeTruthy();
  });

  it('404 mostra referência não encontrada', async () => {
    const { fixture } = await renderDetail(REFERENCIA_INEXISTENTE_ID, 'FINANCEIRO');
    await estabilizar(fixture);

    expect(screen.getByText('Referência Pix não encontrada.')).toBeTruthy();
  });

  it('referência DIVERGENTE destaca status correspondente', async () => {
    server.use(
      http.get(REFERENCIAS_URL, () =>
        HttpResponse.json({
          referenciaId: REFERENCIA_ATIVA_ID,
          parcelaId: 'a0000000-0000-4000-8000-000000000001',
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

    expect(screen.getAllByText('Divergente').length).toBeGreaterThan(0);
  });
});
