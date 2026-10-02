import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';
import { AgendaTomadorPageComponent } from './agenda-tomador-page.component';

// Contrato 5b771c05 da carteira: R$ 3.125,00 contratados em 10 parcelas de R$ 312,50,
// sete pagas, duas em atraso e uma a vencer.
const CONTRATO_COM_AGENDA_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771e03';
const CONTRATO_SEM_AGENDA_ID = '6f0799c0-98b9-6d9d-bc4a-7d6f5b771beef';

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

function renderAgenda(contratoId: string) {
  return render(AgendaTomadorPageComponent, {
    providers: [
      provideHttpClient(),
      provideRouter([]),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ contratoId }) } },
      },
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

describe('AgendaTomadorPageComponent — Mockup 32', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('mostra o painel do contrato e a agenda completa', async () => {
    const { fixture } = await renderAgenda(CONTRATO_COM_AGENDA_ID);
    await estabilizar(fixture);

    expect(screen.getByRole('heading', { name: /Agenda do contrato 5b771c05/ })).toBeTruthy();
    expect(screen.getByText('INVESTIMENTO')).toBeTruthy();
    expect(document.querySelectorAll('.px32-tabela-wrap tbody tr')).toHaveLength(10);
  });

  // Os agregados são somados da própria lista devolvida: recebido + em aberto tem de
  // fechar no contratado, e atrasado + a vencer no em aberto.
  it('as métricas fecham com o valor contratado', async () => {
    const { fixture } = await renderAgenda(CONTRATO_COM_AGENDA_ID);
    await estabilizar(fixture);

    const valores = Array.from(document.querySelectorAll('.px32-metrica strong')).map((el) =>
      valorNumerico(el.textContent),
    );
    const [recebido, emAberto, atrasado, aVencer] = valores;

    expect(recebido + emAberto).toBe(3125);
    expect(atrasado + aVencer).toBe(emAberto);
    expect(emAberto).toBe(937.5);
  });

  // Nenhum contrato da base fictícia pode superar o teto de R$ 15.000,00 do regimento SEP.
  it('o valor contratado respeita o teto do regimento SEP', async () => {
    const { fixture } = await renderAgenda(CONTRATO_COM_AGENDA_ID);
    await estabilizar(fixture);

    const contratado = valorNumerico(
      document.querySelectorAll('.px32-contrato-linha dd')[2]?.textContent,
    );
    expect(contratado).toBe(3125);
    expect(contratado).toBeLessThanOrEqual(15000);
  });

  it('cada parcela aponta para o detalhe financeiro', async () => {
    const { fixture } = await renderAgenda(CONTRATO_COM_AGENDA_ID);
    await estabilizar(fixture);

    const link = screen.getByText('1 de 10').closest('a');
    expect(link?.getAttribute('href')).toBe(
      '/app/cobranca/financeiro/parcelas/a0000000-0000-4000-8000-000000000311',
    );
  });

  it('as abas filtram a agenda e o rodapé acompanha', async () => {
    const { fixture } = await renderAgenda(CONTRATO_COM_AGENDA_ID);
    await estabilizar(fixture);

    fireEvent.click(screen.getByRole('tab', { name: 'Atrasadas' }));
    fixture.detectChanges();
    expect(document.querySelectorAll('.px32-tabela-wrap tbody tr')).toHaveLength(2);
    expect(screen.getByText(/Exibindo 1 a 2 de 2 parcelas/)).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Pagas' }));
    fixture.detectChanges();
    expect(document.querySelectorAll('.px32-tabela-wrap tbody tr')).toHaveLength(7);
  });

  it('"Ver todas" das parcelas em atraso troca a aba da tabela', async () => {
    const { fixture, container } = await renderAgenda(CONTRATO_COM_AGENDA_ID);
    await estabilizar(fixture);

    const listas = container.querySelectorAll('.px32-lista');
    const verTodas = listas[1].querySelector('.px32-link-todos') as HTMLButtonElement;
    fireEvent.click(verTodas);
    fixture.detectChanges();

    expect(
      (container.querySelector('.px32-abas button.ativa') as HTMLElement).textContent,
    ).toContain('Atrasadas');
  });

  it('controles sem endpoint aparecem desabilitados com o motivo', async () => {
    const { fixture } = await renderAgenda(CONTRATO_COM_AGENDA_ID);
    await estabilizar(fixture);

    const lembrete = screen.getByRole('button', { name: /Enviar lembrete/ });
    expect(lembrete.hasAttribute('disabled')).toBe(true);
    expect(lembrete.getAttribute('title')).toContain('endpoint');
  });

  it('mostra estado indisponivel quando a agenda nao existe (404)', async () => {
    const { fixture } = await renderAgenda(CONTRATO_SEM_AGENDA_ID);
    await estabilizar(fixture);

    expect(screen.getByText(/Agenda em geração ou indisponível/)).toBeTruthy();
  });
});
