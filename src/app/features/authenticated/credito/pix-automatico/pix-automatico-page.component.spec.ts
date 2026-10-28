import { importProvidersFrom, signal } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthService } from '../../../../core/auth/auth.service';
import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';
import { resetCobrancaState } from '../../../../../mocks/handlers';
import { PixAutomaticoPageComponent } from './pix-automatico-page.component';

async function estabilizar(fixture: ComponentFixture<unknown>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 60));
  for (let i = 0; i < 12; i += 1) await Promise.resolve();
  fixture.detectChanges();
}

function renderPagina(role: 'ADMIN' | 'BACKOFFICE' = 'ADMIN') {
  return render(PixAutomaticoPageComponent, {
    providers: [
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      provideHttpClient(),
      provideRouter([]),
      {
        provide: AuthService,
        useValue: { currentUser: signal({ role, username: 'operador@empresa.com' }) },
      },
    ],
  });
}

describe('PixAutomaticoPageComponent', () => {
  beforeEach(() => resetCobrancaState());

  it('lista os contratos da carteira com a situacao do Pix Automatico', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    expect(screen.getByText('Contratos da carteira')).toBeTruthy();
    expect(screen.getAllByText('5b771c03').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ativa').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Aguardando o banco do tomador').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Habilitar' }).length).toBeGreaterThan(0);
  });

  it('o administrador ve o botao de parametros', async () => {
    const { fixture } = await renderPagina('ADMIN');
    await estabilizar(fixture);
    expect(screen.queryByRole('button', { name: /Parâmetros/ })).not.toBeNull();
  });

  it('o operador nao ve o botao de parametros', async () => {
    const { fixture } = await renderPagina('BACKOFFICE');
    await estabilizar(fixture);
    expect(screen.queryByRole('button', { name: /Parâmetros/ })).toBeNull();
  });

  it('so envia o pedido ao banco com consentimento e dados completos do pagador', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    fireEvent.click(screen.getAllByRole('button', { name: 'Habilitar' })[0]);
    fixture.detectChanges();
    const enviar = () =>
      screen.getByRole('button', { name: 'Enviar ao banco do tomador' }) as HTMLButtonElement;
    expect(enviar().disabled).toBe(true);

    const preencher = (nome: string, valor: string) =>
      fireEvent.input(document.querySelector(`input[name="${nome}"]`) as HTMLInputElement, {
        target: { value: valor },
      });
    preencher('p-nome', 'Mercearia Boa Vista Ltda');
    preencher('p-doc', '11222333000181');
    preencher('p-banco', 'Banco do Brasil S.A.');
    preencher('p-ispb', '00000000');
    preencher('p-ag', '0001');
    preencher('p-conta', '998877');
    await estabilizar(fixture);
    // Tudo preenchido, mas sem o consentimento do tomador ainda nao envia.
    expect(enviar().disabled).toBe(true);

    fireEvent.click(document.querySelector('input[name="p-consent"]') as HTMLInputElement);
    await estabilizar(fixture);
    expect(enviar().disabled).toBe(false);

    // ISPB invalido volta a bloquear.
    preencher('p-ispb', '123');
    await estabilizar(fixture);
    expect(enviar().disabled).toBe(true);
  });
});
