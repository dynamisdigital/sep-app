import { importProvidersFrom } from '@angular/core';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { describe, expect, it, vi } from 'vitest';
import { throwError } from 'rxjs';

import { CreditoService } from '../../../../core/credito/credito.service';
import { PropostaCreatePageComponent } from './proposta-create-page.component';
import { LucideAngularModule } from 'lucide-angular';
import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';

const PROPOSTA_CRIADA_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c07';
const ONBOARDING_APROVADO = '2f0799c0-98b9-6d9d-bc4a-7d6f5b771f01';

async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

async function estabilizar(fixture: ComponentFixture<unknown>): Promise<void> {
  await new Promise<void>((resolve) => window.setTimeout(resolve, 50));
  await flush();
  fixture.detectChanges();
}

function renderPagina() {
  return render(PropostaCreatePageComponent, {
    providers: [
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      provideHttpClient(),
      provideRouter([]),
    ],
  });
}

function preencher(onboardingId: string): void {
  fireEvent.input(screen.getByLabelText('Onboarding aprovado'), {
    target: { value: onboardingId },
  });
  fireEvent.input(screen.getByLabelText('Valor solicitado (BRL)'), {
    target: { value: '125000' },
  });
  const prazo = screen.getByLabelText('Prazo (meses)') as HTMLSelectElement;
  const opcaoDozeMeses = Array.from(prazo.options).find((option) => option.text === '12');
  fireEvent.change(prazo, { target: { value: opcaoDozeMeses?.value } });
}

describe('PropostaCreatePageComponent', () => {
  it('valida campos obrigatorios antes de enviar', async () => {
    const { fixture } = await renderPagina();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fireEvent.submit(screen.getByText('Enviar proposta').closest('form') as HTMLFormElement);
    await estabilizar(fixture);

    expect(screen.getByText('Informe um valor maior que zero.')).toBeTruthy();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('impede solicitação acima do limite máximo de R$ 15.000,00', async () => {
    const { fixture } = await renderPagina();

    fireEvent.input(screen.getByLabelText('Valor solicitado (BRL)'), {
      target: { value: '1500001' },
    });
    fireEvent.blur(screen.getByLabelText('Valor solicitado (BRL)'));
    fixture.detectChanges();

    expect(screen.getByText('O valor máximo de crédito é R$ 15.000,00.')).toBeTruthy();
    expect(screen.getByText('Enviar proposta')).toBeDisabled();
  });

  it('cria proposta e navega para o detalhe em sucesso', async () => {
    const { fixture } = await renderPagina();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    preencher(ONBOARDING_APROVADO);
    fixture.detectChanges();
    fireEvent.click(screen.getByText('Enviar proposta'));
    await estabilizar(fixture);

    expect(navigateSpy).toHaveBeenCalledWith(['/app/credito/propostas', PROPOSTA_CRIADA_ID]);
  });

  it('mostra pre-condicao de onboarding pendente em 422', async () => {
    const { fixture } = await renderPagina();
    const credito = TestBed.inject(CreditoService);
    vi.spyOn(credito, 'criarProposta').mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 422 })),
    );

    preencher(ONBOARDING_APROVADO);
    fixture.detectChanges();
    fireEvent.click(screen.getByText('Enviar proposta'));
    await estabilizar(fixture);

    expect(screen.getByText('O onboarding informado ainda nao esta aprovado.')).toBeTruthy();
  });

  it('atualiza a simulação e limpa os campos', async () => {
    const { fixture } = await renderPagina();

    preencher(ONBOARDING_APROVADO);
    fixture.detectChanges();

    expect(screen.getAllByText('R$ 1.250,00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('12 meses').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Valor solicitado (BRL)')).toHaveValue('1.250,00');

    fireEvent.click(screen.getByText('Limpar campos'));
    fixture.detectChanges();

    expect(screen.getByLabelText('Valor solicitado (BRL)')).toHaveValue('');
    expect(screen.getByText('Enviar proposta')).toBeDisabled();
  });
});
