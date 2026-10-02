import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { Observable, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import {
  EmpresaCredoraResponse,
  StatusOnboardingEmpresaResponse,
} from '../../../../core/api/api.models';
import { CredoraService } from '../../../../core/credora/credora.service';
import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';
import { OnboardingService } from '../../../../core/onboarding/onboarding.service';
import { CredoraCadastroPageComponent } from './credora-cadastro-page.component';

const ONBOARDING_ID = '7f0799c0-98b9-6d9d-bc4a-7d6f5b78a001';

const ONBOARDING_APROVADO = {
  id: ONBOARDING_ID,
  status: 'APROVADO_FINAL',
  dataCriacao: '2026-05-18T10:00:00-03:00',
  dataModificacao: '2026-05-20T10:32:00-03:00',
  dadosEmpresa: {
    cnpj: '12.345.678/0001-90',
    razaoSocial: 'Empresa Exemplo Ltda.',
    nomeFantasia: null,
    tipoSocietario: null,
    porte: null,
  },
  documentosEnviados: [],
  representantes: [],
  resultado: null,
} as unknown as StatusOnboardingEmpresaResponse;

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

function erro(status: number, message: string): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: { message } });
}

async function renderPagina(
  cadastrarCredora: () => Observable<EmpresaCredoraResponse>,
  consultarEmpresa: () => Observable<StatusOnboardingEmpresaResponse> = () =>
    of(ONBOARDING_APROVADO),
) {
  const view = await render(CredoraCadastroPageComponent, {
    providers: [
      provideHttpClient(),
      provideRouter([]),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      { provide: CredoraService, useValue: { cadastrarCredora } },
      { provide: OnboardingService, useValue: { consultarEmpresa } },
    ],
  });
  const router = TestBed.inject(Router);
  const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  return { ...view, navigateSpy };
}

function preencherOnboarding(): void {
  const campo = document.getElementById('onboardingId') as HTMLInputElement;
  fireEvent.input(campo, { target: { value: ONBOARDING_ID } });
}

async function informarOnboarding(fixture: ComponentFixture<unknown>): Promise<void> {
  preencherOnboarding();
  fireEvent.blur(document.getElementById('onboardingId') as HTMLInputElement);
  await estabilizar(fixture);
}

describe('CredoraCadastroPageComponent — Mockup 36', () => {
  // Os dados de identificação vêm do onboarding e o desenho os apresenta sem permitir edição.
  it('razão social e CNPJ nascem desabilitados e se preenchem do onboarding', async () => {
    const { fixture } = await renderPagina(() => of({} as EmpresaCredoraResponse));
    await estabilizar(fixture);

    const razao = document.getElementById('razaoSocial') as HTMLInputElement;
    const cnpj = document.getElementById('cnpj') as HTMLInputElement;
    expect(razao.disabled).toBe(true);
    expect(cnpj.disabled).toBe(true);
    expect(razao.value).toBe('');

    await informarOnboarding(fixture);

    expect(razao.value).toBe('Empresa Exemplo Ltda.');
    expect(cnpj.value).toBe('12.345.678/0001-90');
    expect(screen.getByText('Aprovado')).toBeTruthy();
    expect(screen.getByText(/Aprovado em 20\/05\/2026/)).toBeTruthy();
  });

  it('onboarding não aprovado aparece com o selo de alerta, sem bloquear o envio', async () => {
    const { fixture } = await renderPagina(
      () => of({} as EmpresaCredoraResponse),
      () => of({ ...ONBOARDING_APROVADO, status: 'EM_ANALISE' } as StatusOnboardingEmpresaResponse),
    );
    await informarOnboarding(fixture);

    expect(screen.getByText('Não aprovado')).toBeTruthy();
    // Quem decide é o backend: a tela não impede a tentativa.
    expect(
      (screen.getByRole('button', { name: /Cadastrar credora/ }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it('falha ao consultar o onboarding avisa sem travar a tela', async () => {
    const { fixture } = await renderPagina(
      () => of({} as EmpresaCredoraResponse),
      () => throwError(() => erro(404, 'nao encontrado')),
    );
    await informarOnboarding(fixture);

    expect(screen.getByText(/Onboarding não encontrado para este identificador/)).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: /Cadastrar credora/ }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it('bloqueia submit sem onboarding e mostra erro obrigatorio', async () => {
    const { fixture, navigateSpy } = await renderPagina(() => of({} as EmpresaCredoraResponse));

    const form = screen.getByRole('button', { name: /Cadastrar credora/ }).closest('form');
    fireEvent.submit(form as HTMLFormElement);
    await estabilizar(fixture);

    expect(screen.getByText(/Informe o identificador do onboarding PJ aprovado/)).toBeTruthy();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('no sucesso roteia para o perfil', async () => {
    const { fixture, navigateSpy } = await renderPagina(() => of({} as EmpresaCredoraResponse));

    await informarOnboarding(fixture);
    fireEvent.click(screen.getByRole('button', { name: /Cadastrar credora/ }));
    await estabilizar(fixture);

    expect(navigateSpy).toHaveBeenCalledWith(['/app/credora/perfil']);
  });

  it('envia onboardingId, tipoCredora e capacidadeAporte do form', async () => {
    const cadastrarCredora = vi.fn(() => of({} as EmpresaCredoraResponse));
    const { fixture } = await renderPagina(cadastrarCredora);

    await informarOnboarding(fixture);
    fireEvent.change(document.getElementById('tipoCredora') as HTMLSelectElement, {
      target: { value: 'INSTITUICAO_FINANCEIRA' },
    });
    // Com a mascara monetaria os digitos entram como centavos: "50000000" e R$ 500.000,00.
    fireEvent.input(document.getElementById('capacidadeAporte') as HTMLInputElement, {
      target: { value: '50000000' },
    });
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: /Cadastrar credora/ }));
    await estabilizar(fixture);

    expect(cadastrarCredora).toHaveBeenCalledWith({
      onboardingId: ONBOARDING_ID,
      tipoCredora: 'INSTITUICAO_FINANCEIRA',
      capacidadeAporte: 500000,
    });
  });

  it('omite capacidadeAporte quando o campo fica em branco', async () => {
    const cadastrarCredora = vi.fn(() => of({} as EmpresaCredoraResponse));
    const { fixture } = await renderPagina(cadastrarCredora);

    await informarOnboarding(fixture);
    fireEvent.click(screen.getByRole('button', { name: /Cadastrar credora/ }));
    await estabilizar(fixture);

    expect(cadastrarCredora).toHaveBeenCalledWith({
      onboardingId: ONBOARDING_ID,
      tipoCredora: 'EMPRESA',
    });
  });

  it('409 (credora ja existente) roteia para o perfil em vez de erro', async () => {
    const { fixture, navigateSpy } = await renderPagina(() =>
      throwError(() => erro(409, 'Credora ja existe (CRD-409-001)')),
    );

    await informarOnboarding(fixture);
    fireEvent.click(screen.getByRole('button', { name: /Cadastrar credora/ }));
    await estabilizar(fixture);

    expect(navigateSpy).toHaveBeenCalledWith(['/app/credora/perfil']);
  });

  it('422 mostra mensagem de KYB incompleto', async () => {
    const { fixture } = await renderPagina(() => throwError(() => erro(422, 'CRD-422-001')));

    await informarOnboarding(fixture);
    fireEvent.click(screen.getByRole('button', { name: /Cadastrar credora/ }));
    await estabilizar(fixture);

    expect(
      screen.getByText('Este onboarding não é de empresa ou o KYB ainda está incompleto.'),
    ).toBeTruthy();
  });

  it('403 mostra mensagem de ownership', async () => {
    const { fixture } = await renderPagina(() => throwError(() => erro(403, 'CRD-403-001')));

    await informarOnboarding(fixture);
    fireEvent.click(screen.getByRole('button', { name: /Cadastrar credora/ }));
    await estabilizar(fixture);

    expect(screen.getByText('Este onboarding pertence a outro usuário.')).toBeTruthy();
  });

  it('404 mostra mensagem de onboarding nao encontrado', async () => {
    const { fixture } = await renderPagina(() => throwError(() => erro(404, 'Onboarding ausente')));

    await informarOnboarding(fixture);
    fireEvent.click(screen.getByRole('button', { name: /Cadastrar credora/ }));
    await estabilizar(fixture);

    expect(
      screen.getByText(
        'Onboarding não encontrado. Confirme o identificador do onboarding PJ aprovado.',
      ),
    ).toBeTruthy();
  });
});
