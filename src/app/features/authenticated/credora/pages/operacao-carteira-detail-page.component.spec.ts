import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { Observable, of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { OperacaoCarteiraResponse } from '../../../../core/api/api.models';
import { CredoraService } from '../../../../core/credora/credora.service';
import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';
import { OperacaoCarteiraDetailPageComponent } from './operacao-carteira-detail-page.component';

const OPERACAO_ID = '7f0799c0-98b9-6d9d-bc4a-7d6f5b78c001';

const OPERACAO: OperacaoCarteiraResponse = {
  id: OPERACAO_ID,
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

function renderDetail(
  consultarOperacaoCarteira: (id: string) => Observable<OperacaoCarteiraResponse>,
) {
  return render(OperacaoCarteiraDetailPageComponent, {
    providers: [
      provideRouter([]),
      provideHttpClient(),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
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
    expect(screen.getAllByText(/ASSINADO/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Associacao assistida apos formalizacao/)).toBeTruthy();
    expect(screen.getAllByText(/8 de 10 parcelas/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/6\.000,00/).length).toBeGreaterThan(0);
  });

  // Progresso e "em aberto" saem do proprio agregado devolvido: nada aqui recalcula cobranca.
  it('deriva progresso e valor em aberto do resumo agregado', async () => {
    const { fixture } = await renderDetail(() => of(OPERACAO));
    await estabilizar(fixture);

    expect(screen.getByText('80% liquidado')).toBeTruthy();
    expect(screen.getAllByText(/1\.200,00/).length).toBeGreaterThan(0);
    expect(screen.getByText('2 parcelas restantes')).toBeTruthy();
  });

  it('operacao sem cobranca avisa ausencia de resumo', async () => {
    const { fixture } = await renderDetail(() => of({ ...OPERACAO, cobranca: null }));
    await estabilizar(fixture);

    expect(screen.getByText('Sem resumo de cobrança para esta operação.')).toBeTruthy();
  });

  it('campos nulos do snapshot aparecem como tracinho, sem "null"', async () => {
    const { fixture } = await renderDetail(() =>
      of({
        ...OPERACAO,
        valor: null,
        prazoMeses: null,
        taxaJurosMensal: null,
        contratoStatus: null,
        cobranca: null,
      }),
    );
    await estabilizar(fixture);

    // Campos nulos do snapshot e da cobranca nunca viram "null" na tela.
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.queryByText('null')).toBeNull();
  });

  it('erro nao-404 mostra mensagem e acao de tentar novamente', async () => {
    const { fixture } = await renderDetail(() =>
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    await estabilizar(fixture);

    expect(screen.getByText('Não foi possível carregar a operação.')).toBeTruthy();
    expect(screen.getByText('Tentar novamente')).toBeTruthy();
  });

  it('404 por ownership mostra operacao nao encontrada', async () => {
    const { fixture } = await renderDetail(() =>
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );
    await estabilizar(fixture);

    expect(screen.getByText('Operação não encontrada.')).toBeTruthy();
  });
});
