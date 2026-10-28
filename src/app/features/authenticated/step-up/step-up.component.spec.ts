import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StepUpTokenStore } from '../../../core/auth/step-up-token.store';
import { LUCIDE_ICONS } from '../../../core/icons/lucide-icons';
import { server } from '../../../../mocks/server';
import { StepUpComponent } from './step-up.component';

const INITIATE_URL = 'http://localhost:8080/api/v1/auth/step-up/initiate';
const COMPLETE_URL = 'http://localhost:8080/api/v1/auth/step-up/complete';
const NEXT = '/app/cobranca/financeiro/parcelas/a0000000-0000-4000-8000-000000000311';

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

function renderStepUp(next: string | null = NEXT) {
  return render(StepUpComponent, {
    providers: [
      provideHttpClient(),
      provideRouter([]),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { queryParamMap: convertToParamMap(next ? { next } : {}) },
        },
      },
    ],
  });
}

async function abrirDesafio(fixture: ComponentFixture<unknown>): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: /Iniciar confirmação/ }));
  await estabilizar(fixture);
}

function digitar(codigo: string): void {
  fireEvent.input(document.getElementById('step-up-codigo') as HTMLInputElement, {
    target: { value: codigo },
  });
}

describe('StepUpComponent — Mockup 33', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('abre no estado inicial, explicando por que a confirmação é pedida', async () => {
    const { fixture } = await renderStepUp();
    await estabilizar(fixture);

    expect(screen.getByRole('heading', { name: 'Confirmação adicional' })).toBeTruthy();
    expect(screen.getByText(/precisamos validar sua identidade/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Iniciar confirmação/ })).toBeTruthy();
    expect(document.getElementById('step-up-codigo')).toBeNull();
  });

  it('iniciar abre o campo do código e já deixa o cursor nele', async () => {
    const { fixture } = await renderStepUp();
    await estabilizar(fixture);
    await abrirDesafio(fixture);

    const campo = document.getElementById('step-up-codigo');
    expect(campo).toBeTruthy();
    expect(document.activeElement).toBe(campo);
  });

  it('código válido guarda o step-up token e volta para a origem', async () => {
    const { fixture } = await renderStepUp();
    await estabilizar(fixture);
    const router = fixture.debugElement.injector.get(Router);
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    await abrirDesafio(fixture);

    digitar('123456');
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await estabilizar(fixture);

    expect(fixture.debugElement.injector.get(StepUpTokenStore).token()).toMatch(/^step-up-/);
    expect(navegar).toHaveBeenCalledWith(NEXT);
  });

  // 422 e não 401: um código digitado errado não pode derrubar a sessão — o
  // errorInterceptor global trata 401 como sessão expirada e faz logout.
  it('código inválido mostra o erro e mantém o operador na tela', async () => {
    const { fixture } = await renderStepUp();
    await estabilizar(fixture);
    const router = fixture.debugElement.injector.get(Router);
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    await abrirDesafio(fixture);

    digitar('000000');
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await estabilizar(fixture);

    expect(screen.getByRole('alert').textContent).toContain('Código inválido');
    expect(document.getElementById('step-up-codigo')).toBeTruthy();
    expect(navegar).not.toHaveBeenCalled();
  });

  it('desafio expirado (410) volta ao estado inicial pedindo uma nova confirmação', async () => {
    const { fixture } = await renderStepUp();
    await estabilizar(fixture);
    await abrirDesafio(fixture);

    server.use(
      http.post(COMPLETE_URL, () => HttpResponse.json({ message: 'expirado' }, { status: 410 })),
    );
    digitar('123456');
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await estabilizar(fixture);

    expect(screen.getByText(/Esta confirmação expirou/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Iniciar confirmação/ })).toBeTruthy();
    expect(document.getElementById('step-up-codigo')).toBeNull();
  });

  it('conta sem MFA não abre o desafio e ganha o atalho para habilitar', async () => {
    server.use(
      http.post(INITIATE_URL, () =>
        HttpResponse.json({ message: 'MFA nao habilitado' }, { status: 400 }),
      ),
    );
    const { fixture } = await renderStepUp();
    await estabilizar(fixture);
    await abrirDesafio(fixture);

    expect(screen.getByText(/MFA não habilitado nesta conta/)).toBeTruthy();
    const atalho = screen.getByRole('link', { name: /Habilitar segunda etapa/ });
    expect(atalho.getAttribute('href')).toBe('/app/profile/setup-totp');
    expect(screen.queryByRole('button', { name: /Iniciar confirmação/ })).toBeNull();
  });

  it('cancelar volta para a origem e diz para onde', async () => {
    const { fixture } = await renderStepUp();
    await estabilizar(fixture);

    const cancelar = screen.getByRole('link', { name: /Cancelar/ });
    expect(cancelar.getAttribute('href')).toBe(NEXT);
    expect(cancelar.textContent).toContain('a parcela');
  });

  it('sem `next` na query, cancelar cai no perfil', async () => {
    const { fixture } = await renderStepUp(null);
    await estabilizar(fixture);

    expect(screen.getByRole('link', { name: /Cancelar/ }).getAttribute('href')).toBe(
      '/app/profile',
    );
  });

  it('com `next` malicioso ou externo, cancelamento e fallback caem no perfil (SEC-05)', async () => {
    const { fixture } = await renderStepUp('https://evil.com/phishing');
    await estabilizar(fixture);

    expect(screen.getByRole('link', { name: /Cancelar/ }).getAttribute('href')).toBe(
      '/app/profile',
    );
  });
});
