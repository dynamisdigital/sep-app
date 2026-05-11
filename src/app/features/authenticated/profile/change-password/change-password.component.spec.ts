import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthService } from '../../../../core/auth/auth.service';
import { ChangePasswordComponent } from './change-password.component';

async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

async function setup() {
  return render(ChangePasswordComponent, {
    providers: [provideRouter([]), provideHttpClient()],
  });
}

async function logarAdmin(result: {
  fixture: {
    debugElement: { injector: { get: <T>(t: unknown) => T } };
    whenStable: () => Promise<unknown>;
  };
}) {
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
    fireEvent.input(novaSenha, { target: { value: '654321' } });
    fireEvent.input(confirmacao, { target: { value: '999999' } });
    fireEvent.blur(confirmacao);

    expect(screen.getByText(/confirmacao nao corresponde/i)).toBeTruthy();
  });

  it('submit valido chama API e mostra sucesso', async () => {
    const result = await setup();
    await logarAdmin(result);
    result.fixture.detectChanges();

    fireEvent.input(screen.getByLabelText(/senha atual/i), { target: { value: '123456' } });
    fireEvent.input(screen.getByLabelText(/^nova senha$/i), { target: { value: '654321' } });
    fireEvent.input(screen.getByLabelText(/confirme a nova senha/i), {
      target: { value: '654321' },
    });
    result.fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: /salvar nova senha/i }));

    await result.fixture.whenStable();
    await flush();
    result.fixture.detectChanges();

    expect(screen.getByRole('status').textContent).toMatch(/sucesso/i);
  });

  it('mostra mensagem de erro do backend em falha', async () => {
    const result = await setup();
    await logarAdmin(result);
    result.fixture.detectChanges();

    fireEvent.input(screen.getByLabelText(/senha atual/i), { target: { value: 'errada' } });
    fireEvent.input(screen.getByLabelText(/^nova senha$/i), { target: { value: '654321' } });
    fireEvent.input(screen.getByLabelText(/confirme a nova senha/i), {
      target: { value: '654321' },
    });
    result.fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: /salvar nova senha/i }));

    await result.fixture.whenStable();
    await flush();
    result.fixture.detectChanges();

    expect(screen.getByRole('alert').textContent).toMatch(/senha atual invalida/i);
  });
});
