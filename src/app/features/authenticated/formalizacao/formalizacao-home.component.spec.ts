import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { FormalizacaoHomeComponent } from './formalizacao-home.component';

const PROPOSTA_APROVADA_ID = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c03';

async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

async function estabilizar(fixture: ComponentFixture<unknown>): Promise<void> {
  await fixture.whenStable();
  await flush();
  fixture.detectChanges();
}

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
