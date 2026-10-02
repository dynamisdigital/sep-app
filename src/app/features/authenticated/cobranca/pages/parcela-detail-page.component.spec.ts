import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';
import { ParcelaDetailPageComponent } from './parcela-detail-page.component';

const PARCELA_ATRASADA_ID = 'a0000000-0000-4000-8000-000000000002';
const PARCELA_INEXISTENTE_ID = 'a0000000-0000-4000-8000-0000000000aa';

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

function renderParcela(id: string) {
  return render(ParcelaDetailPageComponent, {
    providers: [
      provideHttpClient(),
      provideRouter([]),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id }) } } },
    ],
  });
}

describe('ParcelaDetailPageComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('exibe a composicao atualizada com mora/multa e saldo do backend', async () => {
    const { fixture } = await renderParcela(PARCELA_ATRASADA_ID);
    await estabilizar(fixture);

    expect(screen.getByRole('heading', { name: /Parcela 2/ })).toBeTruthy();
    expect(screen.getAllByText('Atrasada').length).toBeGreaterThan(0);
    expect(screen.getByText('Juros de mora')).toBeTruthy();
    expect(screen.getByText('Valor devido atualizado')).toBeTruthy();
    expect(screen.getByText('Valor em aberto')).toBeTruthy();
  });

  it('apresenta a composicao do Mockup 24 com os quatro cartoes laterais', async () => {
    const { fixture } = await renderParcela(PARCELA_ATRASADA_ID);
    await estabilizar(fixture);

    expect(screen.getByRole('heading', { name: 'Valores detalhados' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Status da parcela' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Informações da parcela' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Ações rápidas' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Resumo do contrato/ })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Linha do tempo da parcela' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Informações complementares' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Segurança e conformidade' })).toBeTruthy();
  });

  // Campos de apresentacao vindos do backend: contrato, boleto, classificacao e trilha.
  it('preenche os campos complementares enviados pelo backend', async () => {
    const { fixture } = await renderParcela(PARCELA_ATRASADA_ID);
    await estabilizar(fixture);

    expect(screen.getAllByText('CONT-8d991a11').length).toBeGreaterThan(0);
    expect(screen.getByText('Empresa Exemplo Ltda.')).toBeTruthy();
    expect(screen.getByText('Banco ABCD S.A.')).toBeTruthy();
    expect(screen.getByText('Capital de Giro')).toBeTruthy();
    expect(screen.getByText('operacional')).toBeTruthy();
    // A trilha usa os eventos reais, com data e origem.
    expect(screen.getAllByText(/Sistema/).length).toBeGreaterThan(0);
  });

  // O que o backend deixa nulo continua aparecendo como travessao, nunca em branco.
  it('mantem travessao no campo que o backend envia nulo', async () => {
    const { fixture, container } = await renderParcela(PARCELA_ATRASADA_ID);
    await estabilizar(fixture);

    const valores = Array.from(container.querySelectorAll('.cb24-card dd'));
    expect(valores.length).toBeGreaterThan(30);
    expect(valores.filter((el) => (el.textContent ?? '').trim() === '').length).toBe(0);
    expect(valores.filter((el) => (el.textContent ?? '').trim() === '—').length).toBeGreaterThan(0);
  });

  it('acoes sem endpoint ficam desabilitadas com o motivo no titulo', async () => {
    const { fixture } = await renderParcela(PARCELA_ATRASADA_ID);
    await estabilizar(fixture);

    const boleto = screen.getByRole('button', { name: /Gerar 2ª via boleto/ });
    const lembrete = screen.getByRole('button', { name: /Enviar lembrete/ });
    expect(boleto.hasAttribute('disabled')).toBe(true);
    expect(lembrete.getAttribute('title')).toContain('Sem endpoint');
  });

  it('registrar recebimento leva a tela financeira da parcela', async () => {
    const { fixture } = await renderParcela(PARCELA_ATRASADA_ID);
    await estabilizar(fixture);
    const router = fixture.debugElement.injector.get(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fireEvent.click(screen.getByRole('button', { name: /Registrar recebimento/ }));

    expect(navigate).toHaveBeenCalledWith([
      '/app/cobranca/financeiro/parcelas',
      PARCELA_ATRASADA_ID,
    ]);
  });

  it('mostra estado nao encontrada quando a parcela nao existe (404)', async () => {
    const { fixture } = await renderParcela(PARCELA_INEXISTENTE_ID);
    await estabilizar(fixture);

    expect(screen.getByText('Parcela não encontrada.')).toBeTruthy();
  });
});
