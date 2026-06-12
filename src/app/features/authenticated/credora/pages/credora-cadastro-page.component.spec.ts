import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { Observable, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { EmpresaCredoraResponse } from '../../../../core/api/api.models';
import { CredoraService } from '../../../../core/credora/credora.service';
import { CredoraCadastroPageComponent } from './credora-cadastro-page.component';

const ONBOARDING_ID = '7f0799c0-98b9-6d9d-bc4a-7d6f5b78a001';

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

async function renderPagina(cadastrarCredora: () => Observable<EmpresaCredoraResponse>) {
  const view = await render(CredoraCadastroPageComponent, {
    providers: [provideRouter([]), { provide: CredoraService, useValue: { cadastrarCredora } }],
  });
  const router = TestBed.inject(Router);
  const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  return { ...view, navigateSpy };
}

function preencherOnboarding(): void {
  fireEvent.input(screen.getByLabelText('Onboarding PJ aprovado'), {
    target: { value: ONBOARDING_ID },
  });
}

describe('CredoraCadastroPageComponent', () => {
  it('bloqueia submit sem onboarding e mostra erro obrigatorio', async () => {
    const { fixture, navigateSpy } = await renderPagina(() => of({} as EmpresaCredoraResponse));

    const form = screen.getByRole('button', { name: 'Cadastrar credora' }).closest('form');
    fireEvent.submit(form as HTMLFormElement);
    await estabilizar(fixture);

    expect(screen.getByText('Informe o onboarding PJ aprovado.')).toBeTruthy();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('no sucesso roteia para o perfil', async () => {
    const { fixture, navigateSpy } = await renderPagina(() => of({} as EmpresaCredoraResponse));

    preencherOnboarding();
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar credora' }));
    await estabilizar(fixture);

    expect(navigateSpy).toHaveBeenCalledWith(['/app/credora/perfil']);
  });

  it('409 (credora ja existente) roteia para o perfil em vez de erro', async () => {
    const { fixture, navigateSpy } = await renderPagina(() =>
      throwError(() => erro(409, 'Credora ja existe (CRD-409-001)')),
    );

    preencherOnboarding();
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar credora' }));
    await estabilizar(fixture);

    expect(navigateSpy).toHaveBeenCalledWith(['/app/credora/perfil']);
  });

  it('422 mostra mensagem de KYB incompleto', async () => {
    const { fixture } = await renderPagina(() => throwError(() => erro(422, 'CRD-422-001')));

    preencherOnboarding();
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar credora' }));
    await estabilizar(fixture);

    expect(
      screen.getByText('Este onboarding nao e de empresa ou o KYB ainda esta incompleto.'),
    ).toBeTruthy();
  });

  it('403 mostra mensagem de ownership', async () => {
    const { fixture } = await renderPagina(() => throwError(() => erro(403, 'CRD-403-001')));

    preencherOnboarding();
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar credora' }));
    await estabilizar(fixture);

    expect(screen.getByText('Este onboarding pertence a outro usuario.')).toBeTruthy();
  });

  it('404 mostra mensagem de onboarding nao encontrado', async () => {
    const { fixture } = await renderPagina(() => throwError(() => erro(404, 'Onboarding ausente')));

    preencherOnboarding();
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar credora' }));
    await estabilizar(fixture);

    expect(
      screen.getByText(
        'Onboarding nao encontrado. Confirme o identificador do onboarding PJ aprovado.',
      ),
    ).toBeTruthy();
  });
});
