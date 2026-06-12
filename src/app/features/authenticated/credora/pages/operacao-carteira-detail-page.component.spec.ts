import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { Observable, of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { OperacaoCarteiraResponse } from '../../../../core/api/api.models';
import { CredoraService } from '../../../../core/credora/credora.service';
import { OperacaoCarteiraDetailPageComponent } from './operacao-carteira-detail-page.component';

const OPERACAO_ID = '7f0799c0-98b9-6d9d-bc4a-7d6f5b78c001';

const OPERACAO: OperacaoCarteiraResponse = {
  id: OPERACAO_ID,
  contratoId: 'contrato-1',
  oportunidadeId: 'oportunidade-1',
  status: 'ASSOCIADA',
  justificativa: 'Associacao assistida apos formalizacao',
  valor: 25000,
  prazoMeses: 12,
  taxaJurosMensal: 0.025,
  contratoStatus: 'ASSINADO',
  cobranca: {
    numeroParcelas: 12,
    valorTotal: 27000,
    parcelasPagas: 2,
    parcelasAtrasadas: 0,
    totalRecebido: 4500,
    proximoVencimento: '2026-07-10',
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

function renderDetail(
  consultarOperacaoCarteira: (id: string) => Observable<OperacaoCarteiraResponse>,
) {
  return render(OperacaoCarteiraDetailPageComponent, {
    providers: [
      provideRouter([]),
      { provide: CredoraService, useValue: { consultarOperacaoCarteira } },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ id: OPERACAO_ID }) } },
      },
    ],
  });
}

describe('OperacaoCarteiraDetailPageComponent', () => {
  it('carrega operacao com contrato e resumo agregado de cobranca', async () => {
    const { fixture } = await renderDetail(() => of(OPERACAO));
    await estabilizar(fixture);

    expect(screen.getByText('Associada')).toBeTruthy();
    expect(screen.getByText('ASSINADO')).toBeTruthy();
    expect(screen.getByText('Associacao assistida apos formalizacao')).toBeTruthy();
    expect(screen.getByText('2 pagas de 12')).toBeTruthy();
    expect(screen.getByText(/27\.000,00/)).toBeTruthy();
  });

  it('operacao sem cobranca avisa ausencia de resumo', async () => {
    const { fixture } = await renderDetail(() => of({ ...OPERACAO, cobranca: null }));
    await estabilizar(fixture);

    expect(screen.getByText('Sem resumo de cobranca disponivel para esta operacao.')).toBeTruthy();
  });

  it('404 por ownership mostra operacao nao encontrada', async () => {
    const { fixture } = await renderDetail(() =>
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );
    await estabilizar(fixture);

    expect(screen.getByText('Operacao nao encontrada.')).toBeTruthy();
  });
});
