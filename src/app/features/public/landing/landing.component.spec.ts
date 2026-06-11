import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { LandingComponent } from './landing.component';
import { LUCIDE_ICONS } from '../../../core/icons/lucide-icons';

describe('LandingComponent', () => {
  it('renderiza headline principal', async () => {
    await render(LandingComponent, {
      providers: [provideRouter([]), importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS))],
    });

    expect(
      screen.getByRole('heading', { level: 1, name: /capital de giro com experiencia simples/i }),
    ).toBeTruthy();
  });

  it('expoe links para /login e /register', async () => {
    await render(LandingComponent, {
      providers: [provideRouter([]), importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS))],
    });

    const loginLinks = screen.getAllByRole('link', { name: /entrar/i });
    const registerLinks = screen.getAllByRole('link', { name: /criar conta/i });

    expect(loginLinks.length).toBeGreaterThan(0);
    expect(registerLinks.length).toBeGreaterThan(0);
  });

  it('expoe secao de seguranca/escrow', async () => {
    await render(LandingComponent, {
      providers: [provideRouter([]), importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS))],
    });

    expect(screen.getByRole('heading', { name: /seguranca por desenho/i })).toBeTruthy();
    expect(screen.getAllByText(/escrow/i).length).toBeGreaterThan(0);
  });
});
