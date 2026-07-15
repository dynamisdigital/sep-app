import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { RenegociacaoTomadorPageComponent } from './renegociacao-tomador-page.component';

const PARCELA_EM_NEGOCIACAO_ID = 'a0000000-0000-4000-8000-000000000008';
const PARCELA_PENDENTE_ID = 'a0000000-0000-4000-8000-000000000001';
const PARCELA_SEM_OWNERSHIP_ID = 'a0000000-0000-4000-8000-0000000000ff';

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

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

function renderProposta(parcelaId: string) {
  return render(RenegociacaoTomadorPageComponent, {
    providers: [
      provideHttpClient(),
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ parcelaId }) } },
      },
    ],
  });
}

describe('RenegociacaoTomadorPageComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('mostra loading acessivel enquanto consulta os termos', async () => {
    const { fixture } = await renderProposta(PARCELA_EM_NEGOCIACAO_ID);

    expect(screen.getByRole('status')).toBeTruthy();

    await estabilizar(fixture);
  });

  it('exibe os termos autoritativos da proposta ativa', async () => {
    const { fixture } = await renderProposta(PARCELA_EM_NEGOCIACAO_ID);
    await estabilizar(fixture);

    expect(screen.getByRole('heading', { name: 'Proposta de renegociacao' })).toBeTruthy();
    expect(screen.getByText('Aguardando sua decisao')).toBeTruthy();
    expect(screen.getByText('Novo valor por parcela')).toBeTruthy();
    expect(screen.getByText(/340,00/)).toBeTruthy();
    expect(screen.getByText('Quantidade de parcelas')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('Desconto')).toBeTruthy();
    expect(screen.getByText(/60,00/)).toBeTruthy();
    expect(screen.getByText('Primeiro vencimento')).toBeTruthy();
    expect(screen.getByText('15/08/2026')).toBeTruthy();
    expect(screen.getByText('Data da proposta')).toBeTruthy();
    expect(screen.getByText('Valida ate')).toBeTruthy();
  });

  it('exibe o total exatamente como veio do backend, sem calculo local', async () => {
    const { fixture } = await renderProposta(PARCELA_EM_NEGOCIACAO_ID);
    await estabilizar(fixture);

    expect(screen.getByText('Valor total renegociado')).toBeTruthy();
    expect(screen.getByText(/1\.700,00/)).toBeTruthy();
  });

  it('nao expoe IDs tecnicos nem campos internos no DOM', async () => {
    const { fixture, container } = await renderProposta(PARCELA_EM_NEGOCIACAO_ID);
    await estabilizar(fixture);

    expect(container.textContent).not.toMatch(UUID_PATTERN);
    expect(container.textContent).not.toMatch(/justificativa|proposta por|agenda/i);
  });

  it('mostra proposta indisponivel com volta para a parcela quando o backend responde 404', async () => {
    const { fixture } = await renderProposta(PARCELA_PENDENTE_ID);
    await estabilizar(fixture);

    expect(screen.getByText(/Nenhuma proposta de renegociacao disponivel/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Voltar para a parcela/ })).toBeTruthy();
  });

  it('mostra erro neutro com retry no 403, sem enumerar recurso', async () => {
    const { fixture, container } = await renderProposta(PARCELA_SEM_OWNERSHIP_ID);
    await estabilizar(fixture);

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Tentar novamente/ })).toBeTruthy();
    expect(container.textContent).not.toMatch(UUID_PATTERN);
  });
});
