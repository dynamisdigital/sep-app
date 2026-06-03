import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { describe, expect, it, vi } from 'vitest';

import { PropostaCreatePageComponent } from './proposta-create-page.component';

const PROPOSTA_CRIADA_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c07';
const ONBOARDING_APROVADO = '2f0799c0-98b9-6d9d-bc4a-7d6f5b771f01';
const ONBOARDING_NAO_APROVADO = '99999999-9999-9999-9999-999999999999';

async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

async function estabilizar(fixture: ComponentFixture<unknown>): Promise<void> {
  await fixture.whenStable();
  await flush();
  fixture.detectChanges();
}

function renderPagina() {
  return render(PropostaCreatePageComponent, {
    providers: [provideHttpClient(), provideRouter([])],
  });
}

function preencher(onboardingId: string): void {
  fireEvent.input(screen.getByLabelText('Onboarding aprovado'), {
    target: { value: onboardingId },
  });
  fireEvent.input(screen.getByLabelText('Valor solicitado (BRL)'), { target: { value: '10000' } });
  fireEvent.input(screen.getByLabelText('Prazo (meses)'), { target: { value: '12' } });
}

describe('PropostaCreatePageComponent', () => {
  it('valida campos obrigatorios antes de enviar', async () => {
    const { fixture } = await renderPagina();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fireEvent.submit(screen.getByText('Solicitar credito').closest('form') as HTMLFormElement);
    await estabilizar(fixture);

    expect(screen.getByText('Informe o onboarding aprovado.')).toBeTruthy();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('cria proposta e navega para o detalhe em sucesso', async () => {
    const { fixture } = await renderPagina();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    preencher(ONBOARDING_APROVADO);
    fixture.detectChanges();
    fireEvent.click(screen.getByText('Solicitar credito'));
    await estabilizar(fixture);

    expect(navigateSpy).toHaveBeenCalledWith(['/app/credito/propostas', PROPOSTA_CRIADA_ID]);
  });

  it('mostra pre-condicao de onboarding pendente em 422', async () => {
    const { fixture } = await renderPagina();

    preencher(ONBOARDING_NAO_APROVADO);
    fixture.detectChanges();
    fireEvent.click(screen.getByText('Solicitar credito'));
    await estabilizar(fixture);

    expect(screen.getByText('O onboarding informado ainda nao esta aprovado.')).toBeTruthy();
  });
});
