import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { describe, expect, it, vi } from 'vitest';

import { OnboardingPessoaPageComponent } from './onboarding-pessoa-page.component';
import { estabilizar } from '../../../../../testing/estabilizar';

const PESSOA_ID = '2f0799c0-98b9-6d9d-bc4a-7d6f5b771f01';

function activatedRoute(id?: string) {
  return { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } };
}

function renderPagina(id?: string) {
  return render(OnboardingPessoaPageComponent, {
    providers: [
      provideHttpClient(),
      provideRouter([]),
      { provide: ActivatedRoute, useValue: activatedRoute(id) },
    ],
  });
}

function preencherFormulario(cpf: string) {
  fireEvent.input(screen.getByLabelText('CPF'), { target: { value: cpf } });
  fireEvent.input(screen.getByLabelText('Nome completo'), { target: { value: 'Joao da Silva' } });
  fireEvent.input(screen.getByLabelText('Data de nascimento'), { target: { value: '1990-01-15' } });
}

describe('OnboardingPessoaPageComponent', () => {
  it('sem id: mostra o formulario de inicio', async () => {
    await renderPagina();

    expect(screen.getByLabelText('CPF')).toBeTruthy();
    expect(screen.getByLabelText('Nome completo')).toBeTruthy();
    expect(screen.getByLabelText('Data de nascimento')).toBeTruthy();
  });

  it('inicia o onboarding e navega para o detalhe em sucesso', async () => {
    const { fixture } = await renderPagina();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    preencherFormulario('529.982.247-25');
    fixture.detectChanges();
    fireEvent.click(screen.getByText('Iniciar onboarding'));

    await estabilizar(fixture);

    expect(navigateSpy).toHaveBeenCalledWith(['/app/onboarding/pessoa', PESSOA_ID]);
  });

  it('mostra estado de conflito quando o CPF ja tem onboarding ativo (409)', async () => {
    const { fixture } = await renderPagina();

    preencherFormulario('999.999.999-99');
    fixture.detectChanges();
    fireEvent.click(screen.getByText('Iniciar onboarding'));

    await estabilizar(fixture);

    expect(screen.getByText('Este CPF ja possui um onboarding ativo.')).toBeTruthy();
  });

  it('com id: carrega e exibe o status retornado pela API', async () => {
    const { fixture } = await renderPagina(PESSOA_ID);

    await estabilizar(fixture);

    expect(screen.getByText('APROVADO_FINAL')).toBeTruthy();
  });
});
