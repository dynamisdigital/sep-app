import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { FormalizacaoHomeComponent } from './formalizacao-home.component';
import { estabilizar } from '../../../../testing/estabilizar';

const PROPOSTA_APROVADA_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c03';

function renderHome() {
  return render(FormalizacaoHomeComponent, {
    providers: [provideHttpClient(), provideRouter([])],
  });
}

describe('FormalizacaoHomeComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('lista propostas aprovadas como entrada da formalizacao', async () => {
    const { fixture } = await renderHome();
    await estabilizar(fixture);

    const link = screen.getByText(/Proposta/).closest('a');
    expect(link?.getAttribute('href')).toBe(`/app/formalizacao/proposta/${PROPOSTA_APROVADA_ID}`);
  });
});
