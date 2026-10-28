import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';
import { server } from '../../../../../mocks/server';
import { gerarCodigoTotp } from '../../../../../mocks/totp';
import { SetupTotpComponent } from './setup-totp.component';

const SETUP_URL = 'http://localhost:8080/api/v1/auth/totp/setup';
const CONFIRM_URL = 'http://localhost:8080/api/v1/auth/totp/confirm';

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

function renderSetup() {
  return render(SetupTotpComponent, {
    providers: [
      provideHttpClient(),
      provideRouter([]),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
    ],
  });
}

function digitar(codigo: string): void {
  fireEvent.input(document.getElementById('totp-codigo') as HTMLInputElement, {
    target: { value: codigo },
  });
}

describe('SetupTotpComponent — Mockup 34', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // O desenho já mostra o QR na tela: o setup é disparado na entrada, sem botão intermediário.
  it('prepara o setup na entrada e mostra QR, chave e os quatro passos', async () => {
    const { fixture } = await renderSetup();
    await estabilizar(fixture);

    expect(screen.getByTestId('sep-setup-totp-qr')).toBeTruthy();
    expect(screen.getByTestId('sep-setup-totp-secret').textContent).toMatch(/^[A-Z2-7]{16,}$/);
    expect(document.querySelectorAll('.px34-passos li')).toHaveLength(4);
    expect(document.getElementById('totp-codigo')).toBeTruthy();
  });

  it('deixa o cursor no campo do código assim que o QR aparece', async () => {
    const { fixture } = await renderSetup();
    await estabilizar(fixture);

    expect(document.activeElement).toBe(document.getElementById('totp-codigo'));
  });

  it('código válido ativa a segunda etapa e revela os códigos de backup', async () => {
    const { fixture } = await renderSetup();
    await estabilizar(fixture);

    digitar('123456');
    fixture.detectChanges();
    fireEvent.click(screen.getByTestId('sep-setup-totp-confirm'));
    await estabilizar(fixture);

    expect(
      screen.getByRole('heading', { name: /Autenticação em duas etapas ativada/ }),
    ).toBeTruthy();
    // Os códigos de backup só aparecem depois de ativar, como as dicas do desenho dizem.
    expect(document.querySelectorAll('.px34-backup li').length).toBeGreaterThan(0);
  });

  // O QR e a chave da tela são de um segredo real: o código que o aplicativo autenticador
  // mostra tem de ser aceito, senão não dá para conferir o fluxo com o celular.
  it('aceita o código TOTP calculado a partir da chave que a tela exibe', async () => {
    const { fixture } = await renderSetup();
    await estabilizar(fixture);

    const chave = screen.getByTestId('sep-setup-totp-secret').textContent as string;
    digitar(await gerarCodigoTotp(chave));
    fixture.detectChanges();
    fireEvent.click(screen.getByTestId('sep-setup-totp-confirm'));
    await estabilizar(fixture);

    expect(
      screen.getByRole('heading', { name: /Autenticação em duas etapas ativada/ }),
    ).toBeTruthy();
  });

  it('código inválido mostra o erro e mantém o formulário', async () => {
    const { fixture } = await renderSetup();
    await estabilizar(fixture);

    digitar('000000');
    fixture.detectChanges();
    fireEvent.click(screen.getByTestId('sep-setup-totp-confirm'));
    await estabilizar(fixture);

    expect(screen.getByRole('alert').textContent).toContain('Código inválido');
    expect(document.getElementById('totp-codigo')).toBeTruthy();
    expect(document.querySelector('.px34-backup')).toBeNull();
  });

  it('código fora do formato de 6 dígitos nem chega a ser enviado', async () => {
    const { fixture } = await renderSetup();
    await estabilizar(fixture);
    const enviados: string[] = [];
    server.use(
      http.post(CONFIRM_URL, () => {
        enviados.push('x');
        return new HttpResponse(null, { status: 204 });
      }),
    );

    digitar('12a');
    fixture.detectChanges();
    fireEvent.click(screen.getByTestId('sep-setup-totp-confirm'));
    await estabilizar(fixture);

    expect(enviados).toHaveLength(0);
    expect(screen.queryByRole('heading', { name: /ativada/ })).toBeNull();
  });

  it('conta que já tem MFA (409) não mostra o passo a passo', async () => {
    server.use(
      http.post(SETUP_URL, () => HttpResponse.json({ message: 'ja habilitado' }, { status: 409 })),
    );
    const { fixture } = await renderSetup();
    await estabilizar(fixture);

    expect(screen.getByText(/já está ativa nesta conta/)).toBeTruthy();
    expect(document.querySelector('.px34-passos')).toBeNull();
    expect(screen.getByRole('link', { name: /Voltar ao perfil/ }).getAttribute('href')).toBe(
      '/app/profile',
    );
  });

  it('falha ao preparar o setup mostra o erro e oferece nova tentativa', async () => {
    server.use(http.post(SETUP_URL, () => HttpResponse.error()));
    const { fixture } = await renderSetup();
    await estabilizar(fixture);

    expect(screen.getByRole('alert').textContent).toContain('Não foi possível preparar');
    expect(screen.getByRole('button', { name: /Tentar novamente/ })).toBeTruthy();
  });

  it('cancelar e voltar ao perfil apontam para o perfil', async () => {
    const { fixture } = await renderSetup();
    await estabilizar(fixture);
    const router = fixture.debugElement.injector.get(Router);
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    expect(screen.getByRole('link', { name: /Cancelar/ }).getAttribute('href')).toBe(
      '/app/profile',
    );

    digitar('123456');
    fixture.detectChanges();
    fireEvent.click(screen.getByTestId('sep-setup-totp-confirm'));
    await estabilizar(fixture);
    fireEvent.click(screen.getByRole('button', { name: /Voltar ao perfil/ }));

    expect(navegar).toHaveBeenCalledWith('/app/profile');
  });
});
