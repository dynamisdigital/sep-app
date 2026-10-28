import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';
import { resetGovernancaState } from '../../../../../mocks/handlers';
import { ParametrosPageComponent } from './parametros-page.component';

async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

async function setup() {
  const result = await render(ParametrosPageComponent, {
    providers: [
      provideRouter([]),
      provideHttpClient(),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
    ],
  });
  await result.fixture.whenStable();
  await flush();
  result.fixture.detectChanges();
  return result;
}

function chavesNaTabela(): string[] {
  return Array.from(document.querySelectorAll('.px40-chave strong')).map((el) =>
    (el.textContent ?? '').trim(),
  );
}

describe('ParametrosPageComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetGovernancaState();
  });

  it('lista os parametros do seed com tipos variados', async () => {
    await setup();

    expect(screen.getByText('credito.valor.maximo.pf')).toBeTruthy();
    expect(screen.getByText('credito.prazo.maximo.pf.meses')).toBeTruthy();
    expect(screen.getAllByText('DECIMAL').length).toBeGreaterThan(0);
    expect(screen.getAllByText('INTEGER').length).toBeGreaterThan(0);
  });

  it('cada parametro tem link para o detalhe por chave', async () => {
    await setup();

    const link = screen.getByText('credito.valor.maximo.pf').closest('tr')?.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/app/admin/parametros/credito.valor.maximo.pf');
  });

  // Os agregados do topo somam a propria lista devolvida, para fecharem com a tabela.
  it('resumo soma o catalogo devolvido', async () => {
    const result = await setup();
    const total = screen.getByText('Total de parâmetros').closest('.px40-metrica');
    const ativos = screen.getByText('Ativos no catálogo').closest('.px40-metrica');

    // Com 10 por pagina a tabela nao mostra tudo; o total vem da lista inteira.
    fireEvent.change(screen.getByLabelText(/linhas por página/i), { target: { value: '20' } });
    result.fixture.detectChanges();

    expect(total?.textContent).toContain(String(chavesNaTabela().length));
    expect(ativos?.textContent).toContain(String(chavesNaTabela().length));
  });

  it('busca filtra por chave e por descricao', async () => {
    const result = await setup();

    fireEvent.input(screen.getByLabelText(/buscar por chave ou descrição/i), {
      target: { value: 'open-finance' },
    });
    result.fixture.detectChanges();
    expect(chavesNaTabela().every((c) => c.includes('open-finance'))).toBe(true);

    // "webhook" aparece na descricao e na chave de um unico parametro.
    fireEvent.input(screen.getByLabelText(/buscar por chave ou descrição/i), {
      target: { value: 'webhook' },
    });
    result.fixture.detectChanges();
    expect(chavesNaTabela()).toEqual(['backoffice.webhook.pendente.horas']);
  });

  it('busca sem resultado mostra o estado vazio', async () => {
    const result = await setup();

    fireEvent.input(screen.getByLabelText(/buscar por chave ou descrição/i), {
      target: { value: 'inexistente' },
    });
    result.fixture.detectChanges();

    expect(screen.getByText(/nenhum parâmetro encontrado/i)).toBeTruthy();
  });

  it('filtro por tipo reduz a lista ao conjunto do contrato', async () => {
    const result = await setup();

    fireEvent.click(screen.getByRole('button', { name: /^Filtros/ }));
    result.fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: 'DECIMAL' }));
    result.fixture.detectChanges();

    // O chip do filtro tambem se chama INTEGER, entao a assercao olha os selos da tabela.
    const tiposNaTabela = Array.from(document.querySelectorAll('tbody .px40-selo')).map((el) =>
      (el.textContent ?? '').trim(),
    );
    expect(chavesNaTabela().length).toBeGreaterThan(0);
    expect(new Set(tiposNaTabela)).toEqual(new Set(['DECIMAL']));
  });

  it('ordenacao por versao alterna entre crescente e decrescente', async () => {
    const result = await setup();
    const cabecalho = screen.getByRole('button', { name: /Versão/i });

    fireEvent.click(cabecalho);
    result.fixture.detectChanges();
    const primeiroAsc = document.querySelector('.px40-versao')?.textContent?.trim();

    fireEvent.click(cabecalho);
    result.fixture.detectChanges();
    const primeiroDesc = document.querySelector('.px40-versao')?.textContent?.trim();

    expect(primeiroAsc).toBe('v1');
    expect(primeiroDesc).toBe('v3');
  });

  it('paginacao divide o catalogo e a contagem acompanha', async () => {
    const result = await setup();

    fireEvent.change(screen.getByLabelText(/linhas por página/i), { target: { value: '5' } });
    result.fixture.detectChanges();

    expect(chavesNaTabela().length).toBe(5);
    expect(screen.getByText(/Mostrando 1 a 5 de/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '2' }));
    result.fixture.detectChanges();

    expect(screen.getByText(/Mostrando 6 a 10 de/)).toBeTruthy();
  });

  it('exportar fica desabilitado, com o motivo no titulo', async () => {
    await setup();

    const exportar = screen.getByRole('button', { name: /Exportar/ });
    expect(exportar.hasAttribute('disabled')).toBe(true);
    expect(exportar.getAttribute('title')).toContain('Sem endpoint de exportação');
  });
});
