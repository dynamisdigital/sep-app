import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { Observable, of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';

import {
  ElegibilidadeCredoraResponse,
  EmpresaCredoraResponse,
} from '../../../../core/api/api.models';
import { CredoraService } from '../../../../core/credora/credora.service';
import { CredoraPerfilPageComponent } from './credora-perfil-page.component';

async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

const EMPRESA: EmpresaCredoraResponse = {
  id: 'cr-1',
  usuarioId: 'u-1',
  onboardingId: 'ob-1',
  cnpj: '12.345.678/0001-90',
  razaoSocial: 'Aurora Capital Investimentos LTDA',
  status: 'ATIVA',
  elegibilidade: 'ELEGIVEL',
  motivoInelegibilidade: null,
  tipoCredora: 'EMPRESA',
  capacidadeAporte: 500000,
  dataCriacao: '2026-05-28T12:00:00-03:00',
  dataModificacao: '2026-05-28T12:00:00-03:00',
};

function elegivel(): ElegibilidadeCredoraResponse {
  return { status: 'ATIVA', elegibilidade: 'ELEGIVEL', motivoInelegibilidade: null };
}

async function renderPagina(
  stubs: {
    consultarMinhaCredora: () => Observable<EmpresaCredoraResponse>;
    consultarElegibilidade: () => Observable<ElegibilidadeCredoraResponse>;
  },
  routes: Parameters<typeof provideRouter>[0] = [],
) {
  return render(CredoraPerfilPageComponent, {
    providers: [provideRouter(routes), { provide: CredoraService, useValue: stubs }],
  });
}

describe('CredoraPerfilPageComponent', () => {
  it('ATIVA/ELEGIVEL: apresenta perfil e oferece oportunidades', async () => {
    await renderPagina({
      consultarMinhaCredora: () => of(EMPRESA),
      consultarElegibilidade: () => of(elegivel()),
    });

    expect(screen.getByText('Aurora Capital Investimentos LTDA')).toBeTruthy();
    expect(screen.getByText('Ativa')).toBeTruthy();
    expect(screen.getByText('Elegivel')).toBeTruthy();
    expect(screen.getByText('Ver oportunidades').closest('a')?.getAttribute('href')).toBe(
      '/app/credora/oportunidades',
    );
  });

  it('INELEGIVEL: mostra motivo e nao oferece interesse', async () => {
    await renderPagina({
      consultarMinhaCredora: () =>
        of({
          ...EMPRESA,
          status: 'CADASTRADA',
          elegibilidade: 'INELEGIVEL',
          motivoInelegibilidade: 'Onboarding PJ reprovado na verificacao PLD',
        }),
      consultarElegibilidade: () =>
        of({
          status: 'CADASTRADA',
          elegibilidade: 'INELEGIVEL',
          motivoInelegibilidade: 'Onboarding PJ reprovado na verificacao PLD',
        }),
    });

    expect(screen.getByText('Motivo: Onboarding PJ reprovado na verificacao PLD')).toBeTruthy();
    expect(screen.queryByText('Ver oportunidades')).toBeNull();
  });

  it('SUSPENSA: explica o estado e nao oferece interesse', async () => {
    await renderPagina({
      consultarMinhaCredora: () => of({ ...EMPRESA, status: 'SUSPENSA' }),
      consultarElegibilidade: () =>
        of({ status: 'SUSPENSA', elegibilidade: 'ELEGIVEL', motivoInelegibilidade: null }),
    });

    expect(
      screen.getByText('Sua credora esta suspensa e nao pode manifestar interesse no momento.'),
    ).toBeTruthy();
    expect(screen.queryByText('Ver oportunidades')).toBeNull();
  });

  it('404 em /me: roteia para o cadastro', async () => {
    const { fixture } = await renderPagina(
      {
        consultarMinhaCredora: () => throwError(() => new HttpErrorResponse({ status: 404 })),
        consultarElegibilidade: () => of(elegivel()),
      },
      [{ path: 'app/credora/cadastro', children: [] }],
    );

    await fixture.whenStable();
    await flush();

    expect(TestBed.inject(Router).url).toBe('/app/credora/cadastro');
  });
});
