import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { fireEvent, render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LUCIDE_ICONS } from '../../../core/icons/lucide-icons';
import { PropostaEntryComponent } from './proposta-entry.component';

const PROPOSTA_APROVADA_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c03';
const PROPOSTA_SEM_CONTRATO_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c02';
const CONTRATO_AGUARDANDO_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e01';

async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

async function estabilizar(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let tentativa = 0; tentativa < 12; tentativa += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    await flush();
    fixture.detectChanges();
  }
}

function activatedRoute(propostaId: string) {
  return { snapshot: { paramMap: convertToParamMap({ propostaId }) } };
}

function renderEntry(propostaId: string) {
  return render(PropostaEntryComponent, {
    providers: [
      provideHttpClient(),
      provideRouter([]),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      { provide: ActivatedRoute, useValue: activatedRoute(propostaId) },
    ],
  });
}

describe('PropostaEntryComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('resolve o contrato da proposta e abre o detalhe automaticamente', async () => {
    const { fixture } = await renderEntry(PROPOSTA_APROVADA_ID);
    const router = fixture.debugElement.injector.get(Router);
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    await estabilizar(fixture);

    expect(navegar).toHaveBeenCalledWith(`/app/formalizacao/contratos/${CONTRATO_AGUARDANDO_ID}`);
  });

  it('mostra estado "contrato nao gerado" quando a proposta nao tem contrato (404)', async () => {
    const { fixture } = await renderEntry(PROPOSTA_SEM_CONTRATO_ID);
    await estabilizar(fixture);

    expect(screen.getByText(/ainda não foi gerado/)).toBeTruthy();
  });
  // 404 aqui nao e erro: e a proposta que ainda nao chegou ao ponto de virar contrato. A tela
  // precisa explicar isso e oferecer caminho, em vez de deixar o operador sem saida.
  it('o estado sem contrato explica a regra e oferece caminho', async () => {
    const { fixture } = await renderEntry(PROPOSTA_SEM_CONTRATO_ID);
    await estabilizar(fixture);

    expect(screen.getByText(/O contrato nasce quando a proposta é/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Ver a proposta/ }).getAttribute('href')).toBe(
      `/app/credito/propostas/${PROPOSTA_SEM_CONTRATO_ID}`,
    );
    expect(screen.getByRole('button', { name: /Consultar de novo/ })).toBeTruthy();
  });

  it('a nova tentativa refaz a consulta', async () => {
    const { fixture } = await renderEntry(PROPOSTA_SEM_CONTRATO_ID);
    await estabilizar(fixture);

    fireEvent.click(screen.getByRole('button', { name: /Consultar de novo/ }));
    await estabilizar(fixture);

    // Continua sem contrato, mas a tela nao quebrou nem perdeu o estado.
    expect(screen.getByText(/ainda não foi gerado/)).toBeTruthy();
  });
});
