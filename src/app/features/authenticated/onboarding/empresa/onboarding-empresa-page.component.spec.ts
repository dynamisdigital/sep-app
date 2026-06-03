import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { describe, expect, it, vi } from 'vitest';

import { OnboardingEmpresaPageComponent } from './onboarding-empresa-page.component';

const EMPRESA_ID = '2f0799c0-98b9-6d9d-bc4a-7d6f5b771f02';

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

function activatedRoute(id?: string) {
  return { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } };
}

function renderPagina(id?: string) {
  return render(OnboardingEmpresaPageComponent, {
    providers: [
      provideHttpClient(),
      provideRouter([]),
      { provide: ActivatedRoute, useValue: activatedRoute(id) },
    ],
  });
}

function preencherFormulario(cnpj: string) {
  fireEvent.input(screen.getByLabelText('CNPJ'), { target: { value: cnpj } });
  fireEvent.input(screen.getByLabelText('Razao social'), {
    target: { value: 'Acme Comercio LTDA' },
  });
}

describe('OnboardingEmpresaPageComponent', () => {
  it('sem id: mostra o formulario de inicio', async () => {
    await renderPagina();

    expect(screen.getByLabelText('CNPJ')).toBeTruthy();
    expect(screen.getByLabelText('Razao social')).toBeTruthy();
    expect(screen.getByLabelText('Tipo societario (opcional)')).toBeTruthy();
    expect(screen.getByLabelText('Porte (opcional)')).toBeTruthy();
  });

  it('inicia o onboarding e navega para o detalhe em sucesso', async () => {
    const { fixture } = await renderPagina();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    preencherFormulario('27.865.757/0001-02');
    fixture.detectChanges();
    fireEvent.click(screen.getByText('Iniciar onboarding'));

    await estabilizar(fixture);

    expect(navigateSpy).toHaveBeenCalledWith(['/app/onboarding/empresa', EMPRESA_ID]);
  });

  it('mostra estado de conflito quando o CNPJ ja tem onboarding ativo (409)', async () => {
    const { fixture } = await renderPagina();

    preencherFormulario('99.999.999/9999-99');
    fixture.detectChanges();
    fireEvent.click(screen.getByText('Iniciar onboarding'));

    await estabilizar(fixture);

    expect(screen.getByText('Este CNPJ ja possui um onboarding ativo.')).toBeTruthy();
  });

  it('com id: carrega o status e exibe representante com CPF mascarado', async () => {
    const { fixture } = await renderPagina(EMPRESA_ID);

    await estabilizar(fixture);

    expect(screen.getByText('APROVADO_FINAL')).toBeTruthy();
    expect(screen.getByText('529****4725')).toBeTruthy();
  });
});
