import { importProvidersFrom } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { CreditoHomeComponent } from './credito-home.component';
import { LucideAngularModule } from 'lucide-angular';
import { LUCIDE_ICONS } from '../../../core/icons/lucide-icons';

const PROVIDERS = [
  importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
  provideHttpClient(),
  provideRouter([]),
];

async function esperar(fixture: ComponentFixture<unknown>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 40));
  fixture.detectChanges();
}

/** Texto limpo. `\s` ja cobre o espaco nao separavel que o Intl poe depois de "R$". */
const texto = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

/** O HTML cola rotulo e valor sem espaco; le cada um no seu elemento. */
function pares(seletor: string, rotulo: string, valor: string): Record<string, string> {
  const mapa: Record<string, string> = {};
  for (const bloco of Array.from(document.querySelectorAll(seletor))) {
    mapa[texto(bloco.querySelector(rotulo))] = texto(bloco.querySelector(valor));
  }
  return mapa;
}

describe('CreditoHomeComponent', () => {
  it('apresenta os atalhos de propostas e nova proposta', async () => {
    await render(CreditoHomeComponent, { providers: PROVIDERS });

    expect(screen.getByRole('heading', { name: 'Minhas propostas' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Nova proposta' })).toBeTruthy();
  });

  it('liga os atalhos para as rotas de proposta', async () => {
    await render(CreditoHomeComponent, { providers: PROVIDERS });

    const listaLink = screen.getByRole('link', { name: /Ver minhas propostas/ });
    const novaLink = screen.getByRole('link', { name: /Solicitar nova proposta/ });
    expect(listaLink?.getAttribute('href')).toBe('/app/credito/propostas');
    expect(novaLink?.getAttribute('href')).toBe('/app/credito/propostas/nova');
  });

  // O cartao "aprovadas" somava as pre-aprovadas e dizia 2 enquanto a legenda do grafico, na mesma
  // tela, dizia 1. Cartao, legenda e resumo saem da mesma lista e precisam fechar.
  it('cartao, grafico e resumo contam as mesmas propostas', async () => {
    const { fixture } = await render(CreditoHomeComponent, { providers: PROVIDERS });
    await esperar(fixture);

    const cartoes = pares('.credit-metrics article', 'small', 'strong');
    expect(cartoes['Propostas aprovadas']).toBe('1');
    expect(cartoes['Propostas em análise']).toBe('4');
    expect(cartoes['Propostas pendentes']).toBe('1');
    const aprovadas = Array.from(document.querySelectorAll('.credit-metrics article')).find(
      (c) => texto(c.querySelector('small')) === 'Propostas aprovadas',
    );
    expect(texto(aprovadas ?? null)).toContain('Valor total: R$ 1.250,00');

    const legenda = pares('.proposal-content dl div', 'dt', 'dd');
    expect(legenda['Aprovadas']).toBe('1');
    expect(legenda['Pré-aprovadas']).toBe('1');
    // O cartao e a legenda dizem a mesma coisa sobre "aprovadas".
    expect(cartoes['Propostas aprovadas']).toBe(legenda['Aprovadas']);
  });

  it('o resumo geral sai das propostas, nao de valores escritos no template', async () => {
    const { fixture } = await render(CreditoHomeComponent, { providers: PROVIDERS });
    await esperar(fixture);

    // Oito propostas no mock: 12.750 solicitados, 1.250 aprovados, prazo medio de 15,75 meses.
    expect(texto(document.querySelector('.summary-title b'))).toBe('R$ 12.750,00');
    const resumo = pares('.credit-summary dl div', 'dt', 'dd');
    expect(resumo['Valor total aprovado']).toBe('R$ 1.250,00');
    expect(resumo['Prazo médio solicitado']).toBe('15,8 meses');
    expect(resumo['Taxa média pré-aprovada']).toBe('2,4% a.m.');
    expect(resumo['Última atualização']).toContain('24/04/2026');
    // Os valores que estavam fixos no mockup nao aparecem mais.
    const tudo = texto(document.querySelector('.credit-summary'));
    expect(tudo).not.toMatch(/10\.000,00|3\.750,00|1,85%|30\/05\/2026/);
  });
});
