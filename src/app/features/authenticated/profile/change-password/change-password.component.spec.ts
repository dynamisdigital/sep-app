import { importProvidersFrom } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { resetSenhasDev } from '../../../../../mocks/handlers';
import { AuthService } from '../../../../core/auth/auth.service';
import { ChangePasswordComponent } from './change-password.component';
import { LucideAngularModule } from 'lucide-angular';
import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';

async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

async function waitForHttp(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  await flush();
}

async function setup() {
  return render(ChangePasswordComponent, {
    providers: [
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      provideRouter([]),
      provideHttpClient(),
    ],
  });
}

async function logarAdmin(result: Awaited<ReturnType<typeof setup>>) {
  const auth = result.fixture.debugElement.injector.get<AuthService>(AuthService);
  await new Promise<void>((resolve, reject) => {
    auth.login({ username: 'admin@empresa.com', password: '123456' }).subscribe({
      next: () => resolve(),
      error: reject,
    });
  });
}

describe('ChangePasswordComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // O mock passou a guardar a senha trocada: sem devolver a senha unica, o login do teste
    // seguinte cai em 401 com a senha que o teste anterior definiu.
    resetSenhasDev();
  });

  it('inicia com form invalido', async () => {
    await setup();

    const submit = screen.getByRole('button', { name: /salvar nova senha/i });
    expect(submit.hasAttribute('disabled')).toBe(true);
  });

  it('exige nova senha obrigatoria', async () => {
    await setup();

    const novaSenha = screen.getByLabelText(/^nova senha$/i) as HTMLInputElement;
    fireEvent.input(novaSenha, { target: { value: '' } });
    fireEvent.blur(novaSenha);

    expect(screen.getByText('Informe a nova senha.')).toBeTruthy();
  });

  it('exige confirmacao igual a nova senha', async () => {
    await setup();

    const novaSenha = screen.getByLabelText(/^nova senha$/i) as HTMLInputElement;
    const confirmacao = screen.getByLabelText(/confirme a nova senha/i) as HTMLInputElement;
    fireEvent.input(novaSenha, { target: { value: 'SenhaForte@2026' } });
    fireEvent.input(confirmacao, { target: { value: 'OutraSenha@2026' } });
    fireEvent.blur(confirmacao);

    expect(screen.getByText(/confirmação não corresponde/i)).toBeTruthy();
  });

  it('submit valido chama API e mostra sucesso', async () => {
    const result = await setup();
    await logarAdmin(result);
    result.fixture.detectChanges();

    fireEvent.input(screen.getByLabelText(/^senha atual$/i), {
      target: { value: '123456' },
    });
    fireEvent.input(screen.getByLabelText(/^nova senha$/i), {
      target: { value: 'SenhaForte@2026' },
    });
    fireEvent.input(screen.getByLabelText(/confirme a nova senha/i), {
      target: { value: 'SenhaForte@2026' },
    });
    result.fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: /salvar nova senha/i }));

    await waitForHttp();
    result.fixture.detectChanges();

    expect(screen.getByRole('status').textContent).toMatch(/sucesso/i);
  });

  it('mostra mensagem de erro do backend em falha', async () => {
    const result = await setup();
    await logarAdmin(result);
    result.fixture.detectChanges();

    fireEvent.input(screen.getByLabelText(/^senha atual$/i), {
      target: { value: 'errada' },
    });
    fireEvent.input(screen.getByLabelText(/^nova senha$/i), {
      target: { value: 'SenhaForte@2026' },
    });
    fireEvent.input(screen.getByLabelText(/confirme a nova senha/i), {
      target: { value: 'SenhaForte@2026' },
    });
    result.fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: /salvar nova senha/i }));

    await waitForHttp();
    result.fixture.detectChanges();

    expect(screen.getByRole('alert').textContent).toMatch(/senha atual inválida/i);
  });

  it('calcula força e marca os requisitos conforme a senha digitada', async () => {
    const result = await setup();
    await logarAdmin(result);
    result.fixture.detectChanges();

    fireEvent.input(screen.getByLabelText(/^nova senha$/i), {
      target: { value: 'SenhaForte@2026' },
    });
    result.fixture.detectChanges();

    expect(screen.getByText('96%')).toBeTruthy();
    expect(screen.getByText('Muito forte')).toBeTruthy();
    expect(document.querySelectorAll('.requirement-valid')).toHaveLength(6);
  });

  it('permite mostrar e ocultar os campos de senha', async () => {
    await setup();

    const senhaAtual = screen.getByLabelText(/^senha atual$/i) as HTMLInputElement;
    expect(senhaAtual.type).toBe('password');

    fireEvent.click(screen.getByRole('button', { name: /mostrar ou ocultar senha atual/i }));
    expect(senhaAtual.type).toBe('text');
  });
});
