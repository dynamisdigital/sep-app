import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { render, screen, fireEvent } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { Observable, of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { AporteCredoraResponse, OperacaoCarteiraResponse } from '../../../../core/api/api.models';
import { CredoraService } from '../../../../core/credora/credora.service';
import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';
import { OperacaoCarteiraDetailPageComponent } from './operacao-carteira-detail-page.component';
import { estabilizar } from '../../../../../testing/estabilizar';

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

// O detalhe embute a lista owner-scoped de aportes (F-18.4); o mock do service cobre os dois GETs.
function renderDetail(
  consultarOperacaoCarteira: (id: string) => Observable<OperacaoCarteiraResponse>,
  listarAportes: (id: string) => Observable<AporteCredoraResponse[]> = () => of([]),
) {
  return render(OperacaoCarteiraDetailPageComponent, {
    providers: [
      provideRouter([]),
      provideHttpClient(),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      { provide: CredoraService, useValue: { consultarOperacaoCarteira } },
      { provide: CredoraService, useValue: { consultarOperacaoCarteira, listarAportes } },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ id: OPERACAO_ID }) } },
      },
    ],
  });
}

describe('OperacaoCarteiraDetailPageComponent', () => {
  it('carrega operação com contrato e resumo agregado de cobranca', async () => {
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

  it('operação sem cobranca avisa ausencia de resumo', async () => {
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

  it('erro não-404 mostra mensagem e acao de tentar novamente', async () => {
    const { fixture } = await renderDetail(() =>
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    await estabilizar(fixture);

    expect(screen.getByText('Não foi possível carregar a operação.')).toBeTruthy();
    expect(screen.getByText('Tentar novamente')).toBeTruthy();
  });

  it('404 por ownership mostra operação não encontrada', async () => {
    const { fixture } = await renderDetail(() =>
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );
    await estabilizar(fixture);

    expect(screen.getByText('Operação não encontrada.')).toBeTruthy();
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

    expect(screen.getByText('Nenhum aporte registrado para esta operação.')).toBeTruthy();
  });

  it('falha na lista de aportes não apaga o detalhe já carregado e oferece retry local', async () => {
    let falhar = true;
    const { fixture } = await renderDetail(
      () => of(OPERACAO),
      () => (falhar ? throwError(() => new HttpErrorResponse({ status: 500 })) : of([])),
    );
    await estabilizar(fixture);

    // Detalhe permanece; o erro fica localizado na secao de aportes.
    expect(screen.getByText('Associacao assistida apos formalizacao')).toBeTruthy();
    expect(screen.getByText('Não foi possível carregar os aportes.')).toBeTruthy();

    falhar = false;
    fireEvent.click(screen.getByText('Tentar novamente'));
    await estabilizar(fixture);

    expect(screen.getByText('Nenhum aporte registrado para esta operação.')).toBeTruthy();
  });
});
