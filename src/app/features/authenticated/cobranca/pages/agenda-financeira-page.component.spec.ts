import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';
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
    providers: [
      provideHttpClient(),
      provideRouter([]),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
    ],
  });
}

function valorNumerico(texto: string | null | undefined): number {
  if (!texto) return 0;
  return Number(
    texto
      .replace(/[^\d,]/g, '')
      .replace(/\./g, '')
      .replace(',', '.'),
  );
}

describe('AgendaFinanceiraPageComponent — Mockup 29', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('lista os recebimentos na tabela e sinaliza o gap do backend', async () => {
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    expect(screen.getByRole('heading', { name: 'Recebimentos registrados' })).toBeTruthy();
    expect(screen.getByText(/Sem lista global de agendas/)).toBeTruthy();
    // cinco linhas por página, como no desenho
    expect(document.querySelectorAll('.px29-tabela-wrap tbody tr').length).toBe(5);
    const primeiroLink = document.querySelector('.px29-mono a');
    expect(primeiroLink?.getAttribute('href')).toContain('/app/cobranca/financeiro/parcelas/');
  });

  // Os agregados são somados da própria lista: as fatias têm de fechar no total.
  it('as fatias por status fecham com o total da carteira', async () => {
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    const total = valorNumerico(
      document.querySelector('.px29-rosca-grande strong')?.textContent ?? '',
    );
    const fatias = Array.from(document.querySelectorAll('.px29-resumo .px29-legenda li')).map(
      (li) => valorNumerico(li.querySelector('small')?.textContent ?? ''),
    );
    const soma = fatias.reduce((s, v) => s + v, 0);

    expect(fatias.length).toBe(3);
    expect(total).toBeGreaterThan(0);
    expect(Math.abs(soma - total)).toBeLessThan(1);
  });

  it('as barras por método fecham em 100%', async () => {
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    const percentuais = Array.from(document.querySelectorAll('.px29-barra-pct')).map((el) =>
      Number((el.textContent ?? '').replace('%', '').replace(',', '.')),
    );
    const soma = percentuais.reduce((s, v) => s + v, 0);

    expect(percentuais.length).toBeGreaterThan(1);
    expect(Math.abs(soma - 100)).toBeLessThanOrEqual(0.5);
  });

  // A série usa a última data de pagamento como referência: com qualquer data, a evolução
  // zerava porque a referência caía num vencimento futuro.
  it('a evolução dos sete dias tem valor em mais de um ponto', async () => {
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    const pontos = Array.from(document.querySelectorAll('.px29-grafico circle')).map((c) =>
      Number(c.getAttribute('cy')),
    );
    expect(pontos.length).toBe(7);
    expect(new Set(pontos).size).toBeGreaterThan(1);
  });

  it('a paginação avança e volta pelas páginas', async () => {
    const { fixture } = await renderPage();
    await estabilizar(fixture);
    const primeiraLinha = () =>
      document.querySelector('.px29-tabela-wrap tbody tr td')?.textContent?.trim();
    const inicial = primeiraLinha();

    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }));
    fixture.detectChanges();
    expect(primeiraLinha()).not.toBe(inicial);

    fireEvent.click(screen.getByRole('button', { name: 'Página 1' }));
    fixture.detectChanges();
    expect(primeiraLinha()).toBe(inicial);
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

  it('lookup com apenas espaços não navega (evita rota sem id)', async () => {
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

  it('controles sem endpoint aparecem desabilitados com o motivo', async () => {
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    const filtros = screen.getByRole('button', { name: /Filtros/ });
    expect(filtros.hasAttribute('disabled')).toBe(true);
    expect(filtros.getAttribute('title')).toContain('endpoint');
    const boletos = screen.getByRole('button', { name: /Gerar boletos/ });
    expect(boletos.hasAttribute('disabled')).toBe(true);
  });
});
