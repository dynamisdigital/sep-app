import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { SidenavComponent } from './sidenav.component';
import { AuthService } from '../../core/auth/auth.service';

describe('SidenavComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('sem usuario: mostra dashboard mas oculta administracao', async () => {
    await render(SidenavComponent, {
      providers: [provideRouter([]), provideHttpClient()],
    });

    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.queryByText('Administracao')).toBeNull();
  });

  it('ADMIN: mostra Dashboard e Administracao', async () => {
    const result = await render(SidenavComponent, {
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

    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.getByText('Administracao')).toBeTruthy();
  });
});
