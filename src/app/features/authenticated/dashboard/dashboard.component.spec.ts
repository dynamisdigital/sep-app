import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../../core/auth/auth.service';

describe('DashboardComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('sem usuario: mostra titulo Dashboard generico', async () => {
    await render(DashboardComponent, {
      providers: [provideRouter([]), provideHttpClient()],
    });

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeTruthy();
  });

  it('com usuario: mostra saudacao e role', async () => {
    const result = await render(DashboardComponent, {
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

    expect(screen.getByText(/ola, admin@empresa.com/i)).toBeTruthy();
    expect(screen.getByText('ADMIN')).toBeTruthy();
  });
});
