import { importProvidersFrom } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { PropostasListPageComponent } from './propostas-list-page.component';
import { LucideAngularModule } from 'lucide-angular';
import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';

async function estabilizar(fixture: ComponentFixture<unknown>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 30));
  for (let i = 0; i < 12; i += 1) {
    await Promise.resolve();
  }
  fixture.detectChanges();
}

function renderPagina() {
  return render(PropostasListPageComponent, {
    providers: [
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      provideHttpClient(),
      provideRouter([]),
    ],
  });
}

describe('PropostasListPageComponent', () => {
  it('lista as propostas do tomador retornadas pela API', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    expect(screen.getAllByText('Em análise').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pré-aprovada').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Aprovada').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pendência').length).toBeGreaterThan(0);
  });

  it('liga cada linha ao detalhe da proposta', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    const link = screen.getAllByRole('link').find((a) => a.textContent?.trim() === '5b771c01');
    expect(link?.getAttribute('href')).toBe(
      '/app/credito/propostas/3f0799c0-98b9-6d9d-bc4a-7d6f5b771c01',
    );
  });

  it('mostra atalho para nova proposta', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    const nova = screen.getByText('Nova proposta').closest('a');
    expect(nova?.getAttribute('href')).toBe('/app/credito/propostas/nova');
  });

  it('aplica automaticamente os campos de filtro', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    fireEvent.input(screen.getByPlaceholderText('Buscar por ID, tipo ou valor...'), {
      target: { value: '5b771c08' },
    });
    fixture.detectChanges();

    expect(screen.getByText('Exibindo 1 a 1 de 1 propostas')).toBeTruthy();
    expect(screen.getByText('5b771c08')).toBeTruthy();
  });

  it('usa o olho para ocultar e exibir o valor sem navegar', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    const ocultar = screen.getAllByRole('button', { name: 'Ocultar valor solicitado' })[0];
    fireEvent.click(ocultar);
    fixture.detectChanges();

    expect(screen.getByLabelText('Valor solicitado oculto')).toBeTruthy();
    const mostrar = screen.getAllByRole('button', { name: 'Mostrar valor solicitado' })[0];
    fireEvent.click(mostrar);
    fixture.detectChanges();

    expect(screen.queryByLabelText('Valor solicitado oculto')).toBeNull();
  });

  // Os quatro botoes dos cartoes eram links para esta mesma tela: o clique so recarregava a lista.
  it('deriva os cartoes das propostas carregadas, e nao de constantes', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    const cartao = (rotulo: string) => screen.getByText(rotulo).closest('article')!;
    // Mock: 4 em analise, 1 aprovada e 1 pendencia, de 8 propostas.
    expect(cartao('Propostas em análise').querySelector('strong')?.textContent).toBe('4');
    expect(cartao('Propostas aprovadas').querySelector('strong')?.textContent).toBe('1');
    expect(cartao('Propostas pendentes').querySelector('strong')?.textContent).toBe('1');
    expect(cartao('Propostas em análise').textContent).toContain('50%');
  });

  it('filtra a tabela pelo status do cartao clicado', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    fireEvent.click(screen.getByRole('button', { name: /Ver aprovadas/ }));
    fixture.detectChanges();
    expect(screen.getByText('Exibindo 1 a 1 de 1 propostas')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Ver aprovadas/ }).getAttribute('aria-pressed')).toBe(
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: /Acompanhar/ }));
    fixture.detectChanges();
    expect(screen.getByText('Exibindo 1 a 4 de 4 propostas')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Ver pendentes/ }));
    fixture.detectChanges();
    expect(screen.getByText('Exibindo 1 a 1 de 1 propostas')).toBeTruthy();
  });

  it('abre o painel do limite com o teto do regimento', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    fireEvent.click(screen.getByRole('button', { name: /Ver detalhes do limite/ }));
    fixture.detectChanges();

    const painel = screen.getByRole('dialog', { name: 'Detalhes do limite' });
    expect(painel.textContent).toContain('Teto por proposta');
    // Intl separa "R$" do numero com espaco nao separavel.
    expect(painel.textContent?.replace(/\u00a0/g, ' ')).toContain('R$ 15.000,00');

    fireEvent.click(screen.getAllByRole('button', { name: 'Fechar' })[0]);
    fixture.detectChanges();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  // Os quatro indicadores do pe da tela eram constantes do mockup (71,4%, "Em 12 propostas", R$ 15.000
  // aprovados) que nao fechavam com a tabela. Agora saem das propostas.
  it('os indicadores do pe saem das propostas, nao de constantes', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    const texto = (el: Element) =>
      (el.textContent ?? '').replace(/\s+/g, ' ').replace(/\u00a0/g, ' ');
    const indicadores = Array.from(document.querySelectorAll('.proposal-summaries article')).map(
      texto,
    );
    const de = (rotulo: string) => indicadores.find((i) => i.includes(rotulo))!;

    // Mock: 1 aprovada (R$ 1.250) e 1 reprovada, as duas decididas em 2h15min.
    expect(de('Tempo médio de análise')).toContain('2h 15min');
    expect(de('Tempo médio de análise')).toContain('Em 2 propostas decididas');
    expect(de('Taxa de aprovação')).toContain('50,0%');
    expect(de('Taxa de aprovação')).toContain('1 de 2 decididas');
    expect(de('Valor médio aprovado')).toContain('R$ 1.250,00');
    expect(de('Total aprovado')).toContain('R$ 1.250,00');
    expect(indicadores.join(' ')).not.toMatch(/71,4|Em 12 propostas|30 dias/);
  });
});
