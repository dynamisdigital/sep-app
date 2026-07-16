import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { Observable, of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { AporteCredoraResponse, OperacaoCarteiraResponse } from '../../../../core/api/api.models';
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

// O detalhe embute a lista owner-scoped de aportes (F-18.4); o mock do service cobre os dois GETs.
function renderDetail(
  consultarOperacaoCarteira: (id: string) => Observable<OperacaoCarteiraResponse>,
  listarAportes: (id: string) => Observable<AporteCredoraResponse[]> = () => of([]),
) {
  return render(OperacaoCarteiraDetailPageComponent, {
    providers: [
      provideRouter([]),
      { provide: CredoraService, useValue: { consultarOperacaoCarteira, listarAportes } },
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

    // valor, prazo, taxa e status do contrato nulos -> 4 tracinhos.
    expect(screen.getAllByText('—').length).toBe(4);
    expect(screen.queryByText('null')).toBeNull();
  });

  it('erro nao-404 mostra mensagem e acao de tentar novamente', async () => {
    const { fixture } = await renderDetail(() =>
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    await estabilizar(fixture);

    expect(screen.getByText('Nao foi possivel carregar a operacao.')).toBeTruthy();
    expect(screen.getByText('Tentar novamente')).toBeTruthy();
  });

  it('404 por ownership mostra operacao nao encontrada', async () => {
    const { fixture } = await renderDetail(() =>
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );
    await estabilizar(fixture);

    expect(screen.getByText('Operacao nao encontrada.')).toBeTruthy();
  });

  // --- Aportes owner-scoped (F-18.4) ---

  it('exibe os aportes somente leitura, sem CTA de mutacao', async () => {
    const { fixture } = await renderDetail(
      () => of(OPERACAO),
      () =>
        of([
          {
            id: 'aporte-1',
            operacaoId: OPERACAO_ID,
            status: 'LIQUIDADO',
            valor: 10000,
            dataCriacao: '2026-07-10T12:00:00-03:00',
            dataAtualizacao: '2026-07-11T12:00:00-03:00',
          } satisfies AporteCredoraResponse,
        ]),
    );
    await estabilizar(fixture);

    expect(screen.getByRole('heading', { name: 'Aportes' })).toBeTruthy();
    expect(screen.getByText(/10\.000,00/)).toBeTruthy();
    expect(screen.getByText('Liquidado')).toBeTruthy();
    expect(screen.getByText('Status confirmado pelo backend.')).toBeTruthy();
    // Persona credora: leitura apenas; atualizar status e leitura, registrar e mutacao.
    expect(screen.getByText('Atualizar status')).toBeTruthy();
    expect(screen.queryByText(/Registrar aporte/)).toBeNull();
  });

  it('lista vazia de aportes e estado valido', async () => {
    const { fixture } = await renderDetail(() => of(OPERACAO));
    await estabilizar(fixture);

    expect(screen.getByText('Nenhum aporte registrado para esta operacao.')).toBeTruthy();
  });

  it('falha na lista de aportes nao apaga o detalhe ja carregado e oferece retry local', async () => {
    let falhar = true;
    const { fixture } = await renderDetail(
      () => of(OPERACAO),
      () => (falhar ? throwError(() => new HttpErrorResponse({ status: 500 })) : of([])),
    );
    await estabilizar(fixture);

    // Detalhe permanece; o erro fica localizado na secao de aportes.
    expect(screen.getByText('Associacao assistida apos formalizacao')).toBeTruthy();
    expect(screen.getByText('Nao foi possivel carregar os aportes.')).toBeTruthy();

    falhar = false;
    fireEvent.click(screen.getByText('Tentar novamente'));
    await estabilizar(fixture);

    expect(screen.getByText('Nenhum aporte registrado para esta operacao.')).toBeTruthy();
  });
});
