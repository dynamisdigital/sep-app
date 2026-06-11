import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AgendaFinanceiraPageComponent } from './agenda-financeira-page.component';

const PARCELA_PARCIAL_ID = 'a0000000-0000-4000-8000-000000000003';

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

function renderPage() {
  return render(AgendaFinanceiraPageComponent, {
    providers: [provideHttpClient(), provideRouter([])],
  });
}

describe('AgendaFinanceiraPageComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('lista os recebimentos com meio e parcela e sinaliza os gaps', async () => {
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    expect(screen.getByText('PIX')).toBeTruthy();
    expect(screen.getByText(/Sem lista global de agendas/)).toBeTruthy();
    const link = screen.getByText('PIX').closest('a');
    expect(link?.getAttribute('href')).toBe(
      `/app/cobranca/financeiro/parcelas/${PARCELA_PARCIAL_ID}`,
    );
  });

  it('lookup navega para o detalhe financeiro da parcela informada', async () => {
    const { fixture, container } = await renderPage();
    await estabilizar(fixture);
    const router = fixture.debugElement.injector.get(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const input = container.querySelector('input[formControlName="parcelaId"]') as HTMLInputElement;
    fireEvent.input(input, { target: { value: PARCELA_PARCIAL_ID } });
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    expect(navegar).toHaveBeenCalledWith(['/app/cobranca/financeiro/parcelas', PARCELA_PARCIAL_ID]);
  });

  it('lookup com apenas espacos nao navega (evita rota sem id)', async () => {
    const { fixture, container } = await renderPage();
    await estabilizar(fixture);
    const router = fixture.debugElement.injector.get(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const input = container.querySelector('input[formControlName="parcelaId"]') as HTMLInputElement;
    fireEvent.input(input, { target: { value: '   ' } });
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    expect(navegar).not.toHaveBeenCalled();
  });
});
