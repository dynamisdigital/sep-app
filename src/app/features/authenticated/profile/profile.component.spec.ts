import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthService } from '../../../core/auth/auth.service';
import { ProfileComponent } from './profile.component';

const ACCESS_TOKEN_KEY = 'SEP_ACCESS_TOKEN';

async function logarAdmin(result: {
  fixture: { debugElement: { injector: { get: <T>(t: unknown) => T } } };
}) {
  const auth = result.fixture.debugElement.injector.get<AuthService>(AuthService);
  await new Promise<void>((resolve, reject) => {
    auth.login({ username: 'admin@empresa.com', password: '123456' }).subscribe({
      next: () => resolve(),
      error: reject,
    });
  });
}

describe('ProfileComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renderiza estado vazio quando nao ha currentUser', async () => {
    await render(ProfileComponent, {
      providers: [provideRouter([]), provideHttpClient()],
    });

    expect(screen.getByText('Meu perfil')).toBeTruthy();
    expect(screen.getByText(/nenhum dado de usuario/i)).toBeTruthy();
  });

  it('renderiza e-mail, role e id do usuario logado', async () => {
    const result = await render(ProfileComponent, {
      providers: [provideRouter([]), provideHttpClient()],
    });
    await logarAdmin(result);
    result.fixture.detectChanges();

    expect(screen.getByText('admin@empresa.com')).toBeTruthy();
    expect(screen.getByText('ADMIN')).toBeTruthy();
    expect(screen.getByText('1f0799c0-98b9-6d9d-bc4a-7d6f5b771001')).toBeTruthy();
  });

  it('renderiza campos de auditoria', async () => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, 'mock-jwt-token');
    const result = await render(ProfileComponent, {
      providers: [provideRouter([]), provideHttpClient()],
    });
    await logarAdmin(result);
    result.fixture.detectChanges();

    expect(screen.getByText('Criado em')).toBeTruthy();
    expect(screen.getByText('Modificado em')).toBeTruthy();
    expect(screen.getByText('Criado por')).toBeTruthy();
    expect(screen.getByText('Modificado por')).toBeTruthy();
  });

  it('link Alterar senha aponta para /app/profile/change-password', async () => {
    await render(ProfileComponent, {
      providers: [provideRouter([]), provideHttpClient()],
    });

    const link = screen.getByText('Alterar senha').closest('a');
    expect(link?.getAttribute('href')).toBe('/app/profile/change-password');
  });
});
