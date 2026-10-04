import { importProvidersFrom } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { LandingComponent } from './landing.component';
import { LUCIDE_ICONS } from '../../../core/icons/lucide-icons';

describe('LandingComponent', () => {
  it('renderiza headline principal', async () => {
    await render(LandingComponent, {
      providers: [
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
        provideRouter([]),
        provideHttpClient(),
      ],
    });

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /capital de giro com rastreabilidade, segurança e experiência simples/i,
      }),
    ).toBeTruthy();
  });

  it('expoe links para /login e /register', async () => {
    await render(LandingComponent, {
      providers: [
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
        provideRouter([]),
        provideHttpClient(),
      ],
    });

    const loginLinks = screen.getAllByRole('link', { name: /entrar/i });
    const registerLinks = screen.getAllByRole('link', { name: /criar conta/i });

    expect(loginLinks.length).toBeGreaterThan(0);
    expect(registerLinks.length).toBeGreaterThan(0);
  });

  it('expoe secao de seguranca/escrow', async () => {
    await render(LandingComponent, {
      providers: [
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
        provideRouter([]),
        provideHttpClient(),
      ],
    });

    expect(screen.getByRole('heading', { name: /formalização e escrow/i })).toBeTruthy();
    expect(screen.getAllByText(/escrow/i).length).toBeGreaterThan(0);
  });

  it('usa assets extraidos do mockup na landing', async () => {
    await render(LandingComponent, {
      providers: [
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
        provideRouter([]),
        provideHttpClient(),
      ],
    });

    expect(screen.getAllByText('SEP').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/sociedade de empréstimo entre pessoas/i).length).toBeGreaterThan(0);
    // A marca virou vetor (`sep-logo`): o simbolo le nos dois temas sem arquivo por variante.
    expect(document.querySelector('sep-logo.landing-brand-symbol svg')).toBeTruthy();
    expect(screen.getByRole('button', { name: /tema (claro|escuro)/i })).toBeTruthy();
    expect(document.querySelector('.trust-badges lucide-icon svg')).toBeTruthy();
  });
});
