import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { provideRouter } from '@angular/router';

import { AccessDeniedComponent } from './access-denied.component';

describe('AccessDeniedComponent', () => {
  it('mostra titulo, badge 403 e link para dashboard', async () => {
    await render(AccessDeniedComponent, {
      providers: [provideRouter([])],
    });

    expect(screen.getByRole('heading', { name: 'Acesso negado' })).toBeTruthy();
    expect(screen.getByText('403')).toBeTruthy();
    expect(screen.getByRole('link', { name: /voltar ao dashboard/i })).toBeTruthy();
  });
});
