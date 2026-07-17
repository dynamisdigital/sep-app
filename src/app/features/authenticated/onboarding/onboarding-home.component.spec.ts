import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { OnboardingHomeComponent } from './onboarding-home.component';

const providers = [provideRouter([]), provideHttpClient()];

describe('OnboardingHomeComponent', () => {
  it('apresenta os dois caminhos PF e PJ', async () => {
    await render(OnboardingHomeComponent, { providers });

    expect(screen.getByText('Pessoa física')).toBeTruthy();
    expect(screen.getByText('Empresa')).toBeTruthy();
    expect(screen.getByText('KYC')).toBeTruthy();
    expect(screen.getByText('KYB')).toBeTruthy();
  });

  it('liga PF a /app/onboarding/pessoa e PJ a /app/onboarding/empresa', async () => {
    await render(OnboardingHomeComponent, { providers });

    const pessoaLink = screen.getByRole('link', { name: /iniciar como pessoa física/i });
    const empresaLink = screen.getByRole('link', { name: /iniciar como empresa/i });
    expect(pessoaLink?.getAttribute('href')).toBe('/app/onboarding/pessoa');
    expect(empresaLink?.getAttribute('href')).toBe('/app/onboarding/empresa');
  });

  it('reutiliza o shell operacional homologado e os assets do mockup 06', async () => {
    await render(OnboardingHomeComponent, { providers });

    expect(screen.getByRole('region', { name: /área operacional sep/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /voltar para a tela anterior/i })).toBeTruthy();
    expect(
      document.querySelector(
        'img[src="/image/sep_mockup_06_assets/visuals/visual_kyc_pessoa_fisica_hud.png"]',
      ),
    ).toBeTruthy();
    expect(
      document.querySelector(
        'img[src="/image/sep_mockup_06_assets/visuals/visual_kyb_empresa_hud.png"]',
      ),
    ).toBeTruthy();
  });

  it('apresenta os motivos regulatórios e selos de conformidade', async () => {
    await render(OnboardingHomeComponent, { providers });

    expect(screen.getByText('Por que fazer seu cadastro na SEP?')).toBeTruthy();
    expect(screen.getByText('Plataforma regulada')).toBeTruthy();
    expect(screen.getByText('Rastreabilidade total')).toBeTruthy();
    expect(screen.getByText('CMN')).toBeTruthy();
    expect(screen.getByText('PLD / FT')).toBeTruthy();
    expect(screen.getByText('Auditoria')).toBeTruthy();
  });
});
