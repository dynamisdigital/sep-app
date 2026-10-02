import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';
import { resetPixState } from '../../../../../mocks/handlers';
import { RecebimentosPageComponent } from './recebimentos-page.component';

const RECEBIMENTO_ID = 'e2000000-0000-4000-8000-000000000001';
const RECEBIMENTO_NAO_IDENTIFICADO_ID = 'e2000000-0000-4000-8000-000000000002';

function renderPage() {
  return render(RecebimentosPageComponent, {
    providers: [
      provideHttpClient(),
      provideRouter([]),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
    ],
  });
}

async function estabilizarExemplo(fixture: {
  whenStable: () => Promise<unknown>;
  detectChanges: () => void;
}) {
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('RecebimentosPageComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetPixState();
  });

  it('apresenta a composição principal do Mockup 22', async () => {
    await renderPage();
    expect(screen.getByRole('heading', { name: /Recebimentos Pix/ })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Resultado da consulta' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Status da conciliação' })).toBeTruthy();
    expect(screen.getAllByText('R$ 1.250,00').length).toBeGreaterThan(1);
  });

  it('status da conciliacao conta a carteira devolvida pela API', async () => {
    const { fixture, container } = await renderPage();
    await estabilizarExemplo(fixture);

    // A carteira do mock tem dois recebimentos: um CONCILIADO e um NAO_IDENTIFICADO. Nucleo,
    // anel e legenda saem da mesma contagem — antes o painel anunciava 1.573 e 100%.
    const painel = container.querySelector('.px22-conciliacao') as HTMLElement;
    expect(painel.querySelector('.px22-donut strong')?.textContent).toBe('50,0%');
    const linhas = [...painel.querySelectorAll('li')].map((li) =>
      (li.textContent ?? '').replace(/\s+/g, ' ').trim(),
    );
    expect(linhas).toEqual(['Conciliados1 (50,0%)', 'Pendentes0 (0,0%)', 'Divergentes1 (50,0%)']);
    expect(painel.querySelector('.px22-conciliacao-nota')?.textContent).toContain(
      '2 recebimentos na carteira',
    );
  });

  it('limpa separadamente os dois campos de consulta', async () => {
    const { container } = await renderPage();
    const referencia = container.querySelector('#px22-ref') as HTMLInputElement;
    const recebimento = container.querySelector('#px22-rec') as HTMLInputElement;
    fireEvent.click(screen.getAllByRole('button', { name: /Limpar/ })[0]);
    expect(referencia.value).toBe('');
    expect(recebimento.value).not.toBe('');
  });

  it('consulta um recebimento real e atualiza o resultado', async () => {
    const { fixture, container } = await renderPage();
    const recebimento = container.querySelector('#px22-rec') as HTMLInputElement;
    fireEvent.input(recebimento, { target: { value: RECEBIMENTO_ID } });
    fireEvent.click(screen.getAllByRole('button', { name: /^Consultar$/ })[1]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(screen.getAllByText(RECEBIMENTO_ID).length).toBeGreaterThan(0);
  });

  it('a consulta real substitui os dados do exemplo em todos os widgets', async () => {
    const { fixture, container } = await renderPage();
    expect(screen.getByText('João da Silva')).toBeTruthy();

    const recebimento = container.querySelector('#px22-rec') as HTMLInputElement;
    fireEvent.input(recebimento, { target: { value: RECEBIMENTO_NAO_IDENTIFICADO_ID } });
    fireEvent.click(screen.getAllByRole('button', { name: /^Consultar$/ })[1]);
    await fixture.whenStable();
    fixture.detectChanges();

    // O DTO manda status, valor e motivo; pagador, contrato e protocolo não existem nele e não
    // podem sobrar da consulta anterior.
    expect(screen.getAllByText(/Nao identificado/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('R$ 250,00').length).toBeGreaterThan(0);
    expect(screen.getByText('Referencia Pix nao localizada para o txid recebido')).toBeTruthy();
    expect(screen.queryByText('João da Silva')).toBeNull();
    expect(screen.queryByText('CONT-8d9991a11')).toBeNull();
    expect(screen.queryByText('CONC-20250530-114715')).toBeNull();
  });

  // O resultado da consulta leva ao detalhe do recebimento (Mockup 25). O rótulo exibido não é
  // o id da rota, então o link segue um id navegável próprio.
  it('o ID do recebimento no resultado abre o detalhe', async () => {
    const { fixture, container } = await renderPage();
    await estabilizarExemplo(fixture);

    const link = container.querySelector('.px22-link-detalhe') as HTMLAnchorElement | null;
    expect(link).toBeTruthy();
    expect(link?.getAttribute('href')).toBe(
      '/app/pix/recebimentos/e2000000-0000-4000-8000-000000000001',
    );
  });

  it('consulta real leva o link ao recebimento consultado', async () => {
    const { fixture, container } = await renderPage();
    const recebimento = container.querySelector('#px22-rec') as HTMLInputElement;
    fireEvent.input(recebimento, { target: { value: RECEBIMENTO_NAO_IDENTIFICADO_ID } });
    fireEvent.click(screen.getAllByRole('button', { name: /^Consultar$/ })[1]);
    await fixture.whenStable();
    fixture.detectChanges();

    const link = container.querySelector('.px22-link-detalhe') as HTMLAnchorElement | null;
    expect(link?.getAttribute('href')).toBe(
      `/app/pix/recebimentos/${RECEBIMENTO_NAO_IDENTIFICADO_ID}`,
    );
  });

  it('a aba seleciona o cartão de consulta correspondente e foca o campo', async () => {
    const { fixture, container } = await renderPage();
    const [abaReferencia, abaRecebimento] = screen.getAllByRole('tab');
    const painelReferencia = container.querySelector('#px22-painel-ref') as HTMLElement;
    const painelRecebimento = container.querySelector('#px22-painel-rec') as HTMLElement;
    expect(painelReferencia.classList.contains('ativa')).toBe(true);

    fireEvent.click(abaRecebimento);
    fixture.detectChanges();
    expect(abaRecebimento.getAttribute('aria-selected')).toBe('true');
    expect(abaReferencia.getAttribute('aria-selected')).toBe('false');
    expect(painelRecebimento.classList.contains('ativa')).toBe(true);
    expect(painelReferencia.classList.contains('ativa')).toBe(false);
    expect(document.activeElement).toBe(container.querySelector('#px22-rec'));
  });

  it('a aba acompanha a consulta enviada e marca a origem do resultado', async () => {
    const { fixture, container } = await renderPage();
    // A origem só muda quando um resultado chega: trocar de aba não reescreve o que está na tela.
    fireEvent.click(screen.getAllByRole('tab')[1]);
    fixture.detectChanges();
    expect(screen.getByText('Por referência')).toBeTruthy();

    const recebimento = container.querySelector('#px22-rec') as HTMLInputElement;
    fireEvent.input(recebimento, { target: { value: RECEBIMENTO_ID } });
    fireEvent.click(screen.getAllByRole('button', { name: /^Consultar$/ })[1]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(screen.getByText('Por recebimento')).toBeTruthy();

    // Enviar o formulário da outra consulta traz a aba junto.
    fireEvent.click(screen.getAllByRole('button', { name: /^Consultar$/ })[0]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(screen.getAllByRole('tab')[0].getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('Por referência')).toBeTruthy();
  });

  it('abre e fecha o comprovante legível', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Visualizar' }));
    expect(screen.getByRole('dialog', { name: 'Comprovante Pix' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('ações rápidas navegam para parcela e divergências', async () => {
    const { fixture } = await renderPage();
    const router = fixture.debugElement.injector.get(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fireEvent.click(screen.getByRole('button', { name: /Ir para a parcela/ }));
    fireEvent.click(screen.getByRole('button', { name: /Abrir ocorrência/ }));
    // O atalho segue a parcela vinculada ao resultado, e não um id fixo que não existe.
    expect(navigate).toHaveBeenCalledWith([
      '/app/cobranca/parcelas',
      'a0000000-0000-4000-8000-000000000001',
    ]);
    expect(navigate).toHaveBeenCalledWith(['/app/pix/divergencias']);
  });
});
