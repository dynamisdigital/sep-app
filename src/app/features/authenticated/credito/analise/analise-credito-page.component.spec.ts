import { importProvidersFrom } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';
import { resetCobrancaState } from '../../../../../mocks/handlers';
import { AnaliseCreditoPageComponent } from './analise-credito-page.component';

const PROPOSTA_REJEITADA = '3f0799c0-98b9-6d9d-bc4a-7d6f5b771c08';

async function estabilizar(fixture: ComponentFixture<unknown>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 60));
  for (let i = 0; i < 12; i += 1) await Promise.resolve();
  fixture.detectChanges();
}

function renderPagina(id = PROPOSTA_REJEITADA) {
  return render(AnaliseCreditoPageComponent, {
    providers: [
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      provideHttpClient(),
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id }) } } },
    ],
  });
}

describe('AnaliseCreditoPageComponent', () => {
  beforeEach(() => resetCobrancaState());

  it('so executa a analise depois do consentimento do titular', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    const executar = () =>
      screen.getByRole('button', { name: 'Executar análise' }) as HTMLButtonElement;
    expect(executar().disabled).toBe(true);
    expect(screen.queryByText('Decisão sugerida')).toBeNull();

    fireEvent.click(screen.getByRole('checkbox'));
    await estabilizar(fixture);
    expect(executar().disabled).toBe(false);
  });

  it('mostra decisao, fontes, fatores que somam o score e as regras bloqueantes', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    fireEvent.click(screen.getByRole('checkbox'));
    await estabilizar(fixture);
    fireEvent.click(screen.getByRole('button', { name: 'Executar análise' }));
    await estabilizar(fixture);

    expect(screen.getByText('Decisão sugerida')).toBeTruthy();
    expect(screen.getAllByText('Recusar').length).toBeGreaterThan(0);
    expect(screen.getByText('Serasa')).toBeTruthy();
    expect(screen.getByText('SCR (Banco Central)')).toBeTruthy();
    expect(screen.getAllByText('Bloqueante').length).toBeGreaterThan(0);

    // A linha do total repete o score que o indicador do alto mostra.
    const score = screen
      .getAllByText('Score interno')[0]
      .closest('article')
      ?.querySelector('strong');
    const total = Array.from(document.querySelectorAll('tr strong')).find(
      (e) => e.textContent === score?.textContent,
    );
    expect(total).toBeTruthy();
  });

  it('divergir do motor exige justificativa detalhada', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);
    fireEvent.click(screen.getByRole('checkbox'));
    await estabilizar(fixture);
    fireEvent.click(screen.getByRole('button', { name: 'Executar análise' }));
    await estabilizar(fixture);

    const registrar = () =>
      screen.getByRole('button', { name: 'Registrar parecer' }) as HTMLButtonElement;
    // O formulario ja sugere o que o motor sugeriu (rejeitar), entao uma frase curta basta.
    fireEvent.input(document.querySelector('input[name="justificativa"]') as HTMLInputElement, {
      target: { value: 'De acordo.' },
    });
    await estabilizar(fixture);
    expect(registrar().disabled).toBe(false);

    fireEvent.change(document.querySelector('select[name="decisao"]') as HTMLSelectElement, {
      target: { value: 'APROVAR' },
    });
    await estabilizar(fixture);
    expect(registrar().disabled).toBe(true);
  });
});
