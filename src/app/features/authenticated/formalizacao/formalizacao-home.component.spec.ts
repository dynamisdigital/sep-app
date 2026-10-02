import { importProvidersFrom } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { FormalizacaoHomeComponent } from './formalizacao-home.component';
import { CreditoService } from '../../../core/credito/credito.service';
import { LucideAngularModule } from 'lucide-angular';
import { LUCIDE_ICONS } from '../../../core/icons/lucide-icons';

const PROPOSTA_APROVADA_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c03';

async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

async function estabilizar(fixture: ComponentFixture<unknown>): Promise<void> {
  await flush();
  fixture.detectChanges();
}

function renderHome() {
  return render(FormalizacaoHomeComponent, {
    providers: [
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      provideHttpClient(),
      provideRouter([]),
      {
        provide: CreditoService,
        useValue: {
          listarPropostas: () =>
            of({
              content: [
                {
                  id: PROPOSTA_APROVADA_ID,
                  tomadorId: 'tomador',
                  solicitacaoOnboardingId: 'onboarding',
                  tipoOperacao: 'CAPITAL_GIRO',
                  valorSolicitado: 1250,
                  moeda: 'BRL',
                  prazoMeses: 12,
                  status: 'APROVADA',
                  dataCriacao: '2026-04-24T10:32:00-03:00',
                  dataModificacao: '2026-04-24T10:32:00-03:00',
                  score: null,
                  parecer: null,
                },
              ],
              totalElements: 1,
              totalPages: 1,
              number: 0,
              size: 20,
              first: true,
              last: true,
              numberOfElements: 1,
              empty: false,
            }),
        },
      },
    ],
  });
}

describe('FormalizacaoHomeComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('lista propostas aprovadas como entrada da formalizacao', async () => {
    const { fixture } = await renderHome();
    await estabilizar(fixture);

    expect(screen.getByRole('heading', { name: 'Formalização' })).toBeTruthy();
    expect(screen.getByText('Contratos para formalizar')).toBeTruthy();
    // Os simbolos da tela sao vetor: o que se confere agora e o icone montado, nao o PNG.
    expect(document.querySelector('.formalization-metrics lucide-icon svg')).toBeTruthy();

    const link = screen.getByRole('link', { name: /Acessar contrato/ });
    expect(link?.getAttribute('href')).toBe(`/app/formalizacao/proposta/${PROPOSTA_APROVADA_ID}`);
  });
});
