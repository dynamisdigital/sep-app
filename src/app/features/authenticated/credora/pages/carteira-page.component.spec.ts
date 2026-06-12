import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { Observable, of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { OperacaoCarteiraResponse } from '../../../../core/api/api.models';
import { CredoraService } from '../../../../core/credora/credora.service';
import { CarteiraPageComponent } from './carteira-page.component';

const OPERACAO: OperacaoCarteiraResponse = {
  id: '7f0799c0-98b9-6d9d-bc4a-7d6f5b78c001',
  contratoId: 'contrato-1',
  oportunidadeId: 'oportunidade-1',
  status: 'ASSOCIADA',
  justificativa: 'Associacao assistida apos formalizacao',
  valor: 25000,
  prazoMeses: 12,
  taxaJurosMensal: 0.025,
  contratoStatus: 'ASSINADO',
  cobranca: null,
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
    providers: [provideRouter([]), { provide: CredoraService, useValue: { listarCarteira } }],
  });
}

describe('CarteiraPageComponent', () => {
  it('lista operacoes e linka ao detalhe', async () => {
    const { fixture } = await renderPagina(() => of([OPERACAO]));
    await estabilizar(fixture);

    expect(screen.getByText('Associada')).toBeTruthy();
    expect(screen.getByText(/25\.000,00/)).toBeTruthy();
    expect(screen.getByText('5b78c001').closest('a')?.getAttribute('href')).toBe(
      '/app/credora/carteira/7f0799c0-98b9-6d9d-bc4a-7d6f5b78c001',
    );
  });

  it('valor nulo aparece como tracinho', async () => {
    const { fixture } = await renderPagina(() => of([{ ...OPERACAO, valor: null }]));
    await estabilizar(fixture);

    expect(screen.getByText('—')).toBeTruthy();
  });

  it('estado vazio reforca que interesse nao vira carteira', async () => {
    const { fixture } = await renderPagina(() => of([]));
    await estabilizar(fixture);

    expect(screen.getByText('Voce ainda nao tem operacoes financiadas.')).toBeTruthy();
    expect(screen.getByText(/Manifestar interesse em oportunidades/)).toBeTruthy();
  });

  it('erro mostra mensagem e acao de tentar novamente', async () => {
    const { fixture } = await renderPagina(() =>
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    await estabilizar(fixture);

    expect(screen.getByText('Nao foi possivel carregar a carteira.')).toBeTruthy();
    expect(screen.getByText('Tentar novamente')).toBeTruthy();
  });
});
