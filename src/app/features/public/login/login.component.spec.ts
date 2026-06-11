import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/angular';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/auth/auth.service';
import { LUCIDE_ICONS } from '../../../core/icons/lucide-icons';

async function setup() {
  return render(LoginComponent, {
    providers: [
      provideRouter([]),
      provideHttpClient(),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
    ],
  });
}

async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

describe('LoginComponent', () => {
  it('campos vazios: submit nao chama login', async () => {
    const result = await setup();
    const auth = result.fixture.debugElement.injector.get(AuthService);
    let called = false;
    auth.login = (() => {
      called = true;
      throw new Error('nao deveria ser chamado');
    }) as never;

    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    expect(called).toBe(false);
    expect(screen.getByText('E-mail obrigatorio.')).toBeTruthy();
    expect(screen.getByText('Informe sua senha.')).toBeTruthy();
  });

  it('e-mail invalido bloqueia submit', async () => {
    await setup();
    fireEvent.input(screen.getByLabelText(/e-mail/i), { target: { value: 'nao-eh-email' } });
    fireEvent.input(screen.getByLabelText(/senha/i), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    expect(screen.getByText('Informe um e-mail valido.')).toBeTruthy();
  });

  it('senha vazia mantem botao desabilitado', async () => {
    await setup();
    fireEvent.input(screen.getByLabelText(/e-mail/i), { target: { value: 'a@b.com' } });
    fireEvent.input(screen.getByLabelText(/senha/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    expect(screen.getByText('Informe sua senha.')).toBeTruthy();
  });

  it('credenciais validas: redireciona para /app/dashboard', async () => {
    const result = await setup();
    const router = result.fixture.debugElement.injector.get(Router);
    let navigatedTo: string | null = null;
    router.navigateByUrl = (url: string) => {
      navigatedTo = url;
      return Promise.resolve(true);
    };

    fireEvent.input(screen.getByLabelText(/e-mail/i), {
      target: { value: 'admin@empresa.com' },
    });
    fireEvent.input(screen.getByLabelText(/senha/i), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await result.fixture.whenStable();
    await flush();

    expect(navigatedTo).toBe('/app/dashboard');
  });

  it('credenciais invalidas mostram erro de form', async () => {
    const result = await setup();
    fireEvent.input(screen.getByLabelText(/e-mail/i), { target: { value: 'wrong@empresa.com' } });
    fireEvent.input(screen.getByLabelText(/senha/i), { target: { value: '999999' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await result.fixture.whenStable();
    await flush();
    result.fixture.detectChanges();

    expect(screen.getByText('E-mail ou senha invalidos.')).toBeTruthy();
  });
});
