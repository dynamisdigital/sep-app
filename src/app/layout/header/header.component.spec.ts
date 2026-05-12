import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/angular';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { HeaderComponent } from './header.component';
import { AuthService } from '../../core/auth/auth.service';

const ACCESS_TOKEN_KEY = 'SEP_ACCESS_TOKEN';

describe('HeaderComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('mostra brand SEP', async () => {
    await render(HeaderComponent, {
      providers: [provideRouter([]), provideHttpClient()],
    });

    expect(screen.getByText('SEP')).toBeTruthy();
  });

  it('mostra usuario autenticado e badge de role', async () => {
    const result = await render(HeaderComponent, {
      providers: [provideRouter([]), provideHttpClient()],
    });
    const auth = result.fixture.debugElement.injector.get(AuthService);
    await new Promise<void>((resolve, reject) => {
      auth.login({ username: 'admin@empresa.com', password: '123456' }).subscribe({
        next: () => resolve(),
        error: reject,
      });
    });
    result.fixture.detectChanges();

    expect(screen.getByText('admin@empresa.com')).toBeTruthy();
    expect(screen.getByText('ADMIN')).toBeTruthy();
  });

  it('logout limpa sessao e navega para /login', async () => {
    const result = await render(HeaderComponent, {
      providers: [provideRouter([]), provideHttpClient()],
    });
    const auth = result.fixture.debugElement.injector.get(AuthService);
    const router = result.fixture.debugElement.injector.get(Router);
    let navigatedTo: string | null = null;
    router.navigateByUrl = (url: string) => {
      navigatedTo = url;
      return Promise.resolve(true);
    };

    await new Promise<void>((resolve, reject) => {
      auth.login({ username: 'admin@empresa.com', password: '123456' }).subscribe({
        next: () => resolve(),
        error: reject,
      });
    });
    result.fixture.detectChanges();

    // 5F-FIX-02: logout agora sempre faz POST /auth/logout (MSW responde 204);
    // o efeito de clearSession + navigate fica em microtask posterior.
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
    await result.fixture.whenStable();

    expect(window.localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(auth.currentUser()).toBeNull();
    expect(navigatedTo).toBe('/login');
  });
});
