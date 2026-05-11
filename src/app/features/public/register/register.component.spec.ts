import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/angular';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../../core/auth/auth.service';

async function setup() {
  return render(RegisterComponent, {
    providers: [provideRouter([]), provideHttpClient()],
  });
}

async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

describe('RegisterComponent', () => {
  it('campos vazios: submit nao chama register', async () => {
    const result = await setup();
    const auth = result.fixture.debugElement.injector.get(AuthService);
    let called = false;
    auth.register = (() => {
      called = true;
      throw new Error('nao deveria ser chamado');
    }) as never;

    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    expect(called).toBe(false);
    expect(screen.getByText('E-mail obrigatorio.')).toBeTruthy();
    expect(screen.getByText('Senha obrigatoria.')).toBeTruthy();
  });

  it('e-mail invalido bloqueia submit', async () => {
    await setup();
    fireEvent.input(screen.getByLabelText(/e-mail/i), { target: { value: 'nope' } });
    fireEvent.input(screen.getByLabelText(/senha/i), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    expect(screen.getByText('Informe um e-mail valido.')).toBeTruthy();
  });

  it('senha vazia exibe mensagem obrigatoria', async () => {
    await setup();
    fireEvent.input(screen.getByLabelText(/e-mail/i), { target: { value: 'a@b.com' } });
    fireEvent.input(screen.getByLabelText(/senha/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    expect(screen.getByText('Senha obrigatoria.')).toBeTruthy();
  });

  it('cadastro com e-mail novo: redireciona para /login', async () => {
    const result = await setup();
    const router = result.fixture.debugElement.injector.get(Router);
    let navigatedTo: string | null = null;
    router.navigateByUrl = (url: string) => {
      navigatedTo = url;
      return Promise.resolve(true);
    };

    fireEvent.input(screen.getByLabelText(/e-mail/i), { target: { value: 'novo@empresa.com' } });
    fireEvent.input(screen.getByLabelText(/senha/i), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText(/perfil/i), { target: { value: 'CLIENTE' } });
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    await result.fixture.whenStable();
    await flush();

    expect(navigatedTo).toBe('/login');
  });

  it('e-mail duplicado mostra erro', async () => {
    const result = await setup();

    fireEvent.input(screen.getByLabelText(/e-mail/i), {
      target: { value: 'duplicado@empresa.com' },
    });
    fireEvent.input(screen.getByLabelText(/senha/i), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    await result.fixture.whenStable();
    await flush();
    result.fixture.detectChanges();

    expect(screen.getByText('Ja existe um usuario com este e-mail.')).toBeTruthy();
  });
});
