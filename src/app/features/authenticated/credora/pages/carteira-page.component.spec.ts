import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { Observable, of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { OperacaoCarteiraResponse } from '../../../../core/api/api.models';
import { CredoraService } from '../../../../core/credora/credora.service';
import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';
import { CarteiraPageComponent } from './carteira-page.component';

const OPERACAO: OperacaoCarteiraResponse = {
  id: '7f0799c0-98b9-6d9d-bc4a-7d6f5b78c001',
  contratoId: 'contrato-1',
  oportunidadeId: 'oportunidade-1',
  status: 'ASSOCIADA',
  justificativa: 'Associacao assistida apos formalizacao',
  valor: 6000,
  prazoMeses: 10,
  taxaJurosMensal: 0.025,
  contratoStatus: 'ASSINADO',
  cobranca: {
    numeroParcelas: 10,
    valorTotal: 6000,
    parcelasPagas: 8,
    parcelasAtrasadas: 0,
    totalRecebido: 4800,
    proximoVencimento: '2026-06-25',
  },
  dataCriacao: '2026-05-28T12:00:00-03:00',
};

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

function renderPagina(listarCarteira: () => Observable<OperacaoCarteiraResponse[]>) {
  return render(CarteiraPageComponent, {
    providers: [
      provideRouter([]),
      provideHttpClient(),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      { provide: CredoraService, useValue: { listarCarteira } },
    ],
  });
}

describe('CarteiraPageComponent', () => {
  it('lista operacoes e linka ao detalhe', async () => {
    const { fixture } = await renderPagina(() => of([OPERACAO]));
    await estabilizar(fixture);

    expect(screen.getByText('Associada')).toBeTruthy();
    expect(screen.getAllByText(/6\.000,00/).length).toBeGreaterThan(0);
    expect(screen.getByText('8/10 parcelas')).toBeTruthy();
    expect(screen.getByText('25/06/2026')).toBeTruthy();
    expect(screen.getByText('5b78c001').closest('a')?.getAttribute('href')).toBe(
      '/app/credora/carteira/7f0799c0-98b9-6d9d-bc4a-7d6f5b78c001',
    );
  });

  it('valor nulo aparece como tracinho', async () => {
    const { fixture } = await renderPagina(() =>
      of([{ ...OPERACAO, valor: null, cobranca: null }]),
    );
    await estabilizar(fixture);

    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  // Os agregados do topo saem da propria lista devolvida, para os numeros fecharem com o detalhe.
  it('agregados somam valor financiado, recebido e em aberto da lista', async () => {
    const { fixture } = await renderPagina(() => of([OPERACAO]));
    await estabilizar(fixture);

    expect(screen.getAllByText(/6\.000,00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/4\.800,00/).length).toBeGreaterThan(0);
    expect(screen.getByText(/1\.200,00/)).toBeTruthy();
  });

  it('estado vazio reforca que interesse nao vira carteira', async () => {
    const { fixture } = await renderPagina(() => of([]));
    await estabilizar(fixture);

    expect(screen.getByText('Você ainda não tem operações financiadas.')).toBeTruthy();
    expect(screen.getByText(/Manifestar interesse em oportunidades/)).toBeTruthy();
  });

  it('erro mostra mensagem e acao de tentar novamente', async () => {
    const { fixture } = await renderPagina(() =>
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    await estabilizar(fixture);

    expect(screen.getByText('Não foi possível carregar a carteira.')).toBeTruthy();
    expect(screen.getByText('Tentar novamente')).toBeTruthy();
  });
});
