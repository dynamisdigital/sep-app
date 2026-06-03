import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { OnboardingHomeComponent } from './onboarding-home.component';

describe('OnboardingHomeComponent', () => {
  it('apresenta os dois caminhos PF e PJ', async () => {
    await render(OnboardingHomeComponent, { providers: [provideRouter([])] });

    expect(screen.getByText('Pessoa fisica')).toBeTruthy();
    expect(screen.getByText('Empresa')).toBeTruthy();
  });

  it('liga PF a /app/onboarding/pessoa e PJ a /app/onboarding/empresa', async () => {
    await render(OnboardingHomeComponent, { providers: [provideRouter([])] });

    const pessoaLink = screen.getByText('Pessoa fisica').closest('a');
    const empresaLink = screen.getByText('Empresa').closest('a');
    expect(pessoaLink?.getAttribute('href')).toBe('/app/onboarding/pessoa');
    expect(empresaLink?.getAttribute('href')).toBe('/app/onboarding/empresa');
  });
});
