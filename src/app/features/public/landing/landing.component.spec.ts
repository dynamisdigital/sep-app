import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { LandingComponent } from './landing.component';

describe('LandingComponent', () => {
  it('renderiza headline principal', async () => {
    await render(LandingComponent, {
      providers: [provideRouter([])],
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
      providers: [provideRouter([])],
    });

    const loginLinks = screen.getAllByRole('link', { name: /entrar/i });
    const registerLinks = screen.getAllByRole('link', { name: /criar conta/i });

    expect(loginLinks.length).toBeGreaterThan(0);
    expect(registerLinks.length).toBeGreaterThan(0);
  });

  it('expoe secao de seguranca/escrow', async () => {
    await render(LandingComponent, {
      providers: [provideRouter([])],
    });

    expect(screen.getByRole('heading', { name: /formalização e escrow/i })).toBeTruthy();
    expect(screen.getAllByText(/escrow/i).length).toBeGreaterThan(0);
  });

  it('usa assets extraidos do mockup na landing', async () => {
    await render(LandingComponent, {
      providers: [provideRouter([])],
    });

    expect(screen.getAllByText('SEP').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/sociedade de empréstimo entre pessoas/i).length).toBeGreaterThan(0);
    expect(document.querySelector('.landing-brand-symbol')?.getAttribute('src')).toContain(
      '/image/sep_mockup_01_assets/logos/logo_sep_simbolo_header.png',
    );
    expect(screen.getByAltText(/regulado pela/i).getAttribute('src')).toContain(
      '/image/sep_mockup_01_assets/icons/icon_regulacao_cmn.png',
    );
  });
});
