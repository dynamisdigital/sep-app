import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';
import { InadimplenciaPageComponent } from './inadimplencia-page.component';

// Primeira linha da triagem — a parcela 7 de 10 do contrato 5b771c06, a mais antiga em
// atraso. O detalhe dela nasce da mesma carteira do mock.
const PARCELA_ATRASADA_ID = 'a0000000-0000-4000-8000-000000000327';

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
  return render(InadimplenciaPageComponent, {
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

describe('InadimplenciaPageComponent — Mockup 30', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('lista as parcelas em atraso com link para o detalhe', async () => {
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    expect(screen.getByRole('heading', { name: 'Parcelas inadimplentes' })).toBeTruthy();
    const link = screen.getByText('Parcela 7/10').closest('a');
    expect(link?.getAttribute('href')).toBe(
      `/app/cobranca/financeiro/parcelas/${PARCELA_ATRASADA_ID}`,
    );
  });

  // A base fictícia respeita o teto de R$ 15.000,00 do regimento SEP: os R$ 2.012,50 em
  // atraso são as cinco parcelas vencidas dos dois contratos atrasados da carteira, e o
  // mesmo total aparece na Cobrança e na agenda do contrato.
  it('o total em atraso fecha com a soma das quatro faixas', async () => {
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    const metricas = Array.from(document.querySelectorAll('.px30-metrica strong')).map((el) =>
      valorNumerico(el.textContent),
    );
    const total = metricas[0];
    const soma = metricas.slice(1).reduce((s, v) => s + v, 0);

    expect(total).toBe(2012.5);
    expect(soma).toBe(total);
  });

  it('a exposição por contrato fecha com o total em atraso', async () => {
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    const linhas = Array.from(document.querySelectorAll('.px30-exposicao tbody tr'));
    const soma = linhas.reduce(
      (s, tr) => s + valorNumerico(tr.querySelectorAll('strong')[1]?.textContent),
      0,
    );

    expect(linhas.length).toBeGreaterThan(0);
    expect(soma).toBe(2012.5);
  });

  // Nenhum valor da base fictícia pode superar o teto de R$ 15.000,00 por contrato.
  it('nenhuma parcela ultrapassa o teto do regimento SEP', async () => {
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    const valores = Array.from(document.querySelectorAll('.px30-valor')).map((el) =>
      valorNumerico(el.textContent),
    );
    expect(valores.length).toBeGreaterThan(0);
    expect(Math.max(...valores)).toBeLessThanOrEqual(15000);
  });

  it('filtra por status enviando o query param e atualizando a lista', async () => {
    const { fixture, container } = await renderPage();
    await estabilizar(fixture);

    const select = container.querySelector('select[formControlName="status"]') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'ATRASADA' } });
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: /Aplicar filtros/ }));
    await estabilizar(fixture);

    const status = Array.from(document.querySelectorAll('.px30-selo')).map((el) =>
      el.textContent?.trim(),
    );
    expect(status.length).toBeGreaterThan(0);
    expect(status.every((s) => s === 'Atrasada')).toBe(true);
  });

  it('Limpar devolve a lista completa', async () => {
    const { fixture, container } = await renderPage();
    await estabilizar(fixture);
    const select = container.querySelector('select[formControlName="status"]') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'ATRASADA' } });
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: /Aplicar filtros/ }));
    await estabilizar(fixture);
    const filtrado = document.querySelectorAll('.px30-tabela-wrap tbody tr').length;

    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));
    await estabilizar(fixture);

    expect(document.querySelectorAll('.px30-tabela-wrap tbody tr').length).toBeGreaterThan(
      filtrado,
    );
  });

  it('controles sem endpoint aparecem desabilitados com o motivo', async () => {
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    const notificacoes = screen.getByRole('button', { name: /Gerar notificações/ });
    expect(notificacoes.hasAttribute('disabled')).toBe(true);
    expect(notificacoes.getAttribute('title')).toContain('endpoint');
    expect(screen.getByRole('button', { name: /Negociar em lote/ }).hasAttribute('disabled')).toBe(
      true,
    );
  });
});
