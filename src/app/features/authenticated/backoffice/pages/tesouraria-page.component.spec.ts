import { ComponentFixture } from '@angular/core/testing';
import { fireEvent, screen } from '@testing-library/angular';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { UsuarioRole } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  DivergenciaEscrow,
  OperacaoEscrowResponse,
  OportunidadeTesourariaResponse,
  SaqueResponse,
  TesourariaResumoResponse,
} from '../../../../core/credores/credores-escrow.models';
import { estabilizar, renderizar } from '../../credora/escrow/escrow-teste-util';
import { TesourariaPageComponent } from './tesouraria-page.component';

const RESUMO: TesourariaResumoResponse = {
  totalCustodiado: 20000,
  totalDisponivel: 9000,
  totalReservado: 4625,
  totalEmOperacao: 6375,
  aportesHoje: 0,
  aportesPendentes: 1,
  saquesPendentes: 1,
  credoresAtivos: 3,
};

const PRONTA: OportunidadeTesourariaResponse = {
  id: 'op-estrela',
  devedorId: 'dev-2',
  devedorNome: 'Padaria Estrela ME',
  valor: 4625,
  alocado: 4625,
  faltante: 0,
  taxaJurosMensal: 0.019,
  prazoMeses: 10,
  disponivel: true,
  reservas: 1,
  pronta: true,
};

const FORMADA: OportunidadeTesourariaResponse = {
  ...PRONTA,
  id: 'op-beta',
  devedorNome: 'Comércio Beta ME',
  valor: 6000,
  alocado: 6000,
  disponivel: false,
  reservas: 0,
  pronta: false,
};

const OPERACAO: OperacaoEscrowResponse = {
  operacaoId: 'operacao-beta',
  oportunidadeId: 'op-beta',
  devedorNome: 'Comércio Beta ME',
  principal: 6000,
  taxaJurosMensal: 0.025,
  prazoMeses: 10,
  credores: 1,
  parcelasTotal: 10,
  parcelasRepassadas: 8,
  saldoEmOperacao: 1200,
  proximaParcela: {
    numero: 9,
    vencimento: '2026-06-25',
    principal: 590,
    juros: 30,
    total: 620,
  },
};

const SAQUE: SaqueResponse = {
  id: 's-1',
  credorId: 'credor-1',
  destinatarioId: 'd-1',
  valor: 300,
  status: 'AGUARDANDO_APROVACAO',
  dataCriacao: '2026-10-09T10:00:00-03:00',
};

const DIVERGENCIA: DivergenciaEscrow = {
  id: 'dv-1',
  tipo: 'VALOR_DIVERGENTE',
  credorId: 'credor-1',
  valorEsperado: 1000,
  valorRecebido: 900,
  descricao: 'Pix de aporte com valor diferente do informado',
  data: '2026-10-08T10:00:00-03:00',
};

function servico() {
  return {
    consultarResumoTesouraria: () => of(RESUMO),
    listarOportunidadesTesouraria: () => of([PRONTA, FORMADA]),
    listarOperacoes: () => of([OPERACAO]),
    listarSaquesPendentes: () => of([SAQUE]),
    listarDivergencias: () => of([DIVERGENCIA]),
    desembolsar: vi.fn(() =>
      of({
        operacaoId: 'op-op-estrela',
        credores: 1,
        total: 4625,
        repasseAoDevedorAte: '2026-10-19',
      }),
    ),
    encerrarSemFormar: vi.fn(() => of({ devolvidas: 1, devolverAte: '2026-10-13' })),
    repassarParcela: vi.fn(() =>
      of({
        operacaoId: 'operacao-beta',
        parcela: 9,
        quinhoes: [],
        repasseAoCredorAte: '2026-10-13',
      }),
    ),
    aprovarSaque: vi.fn(() => of({ ...SAQUE, status: 'EXECUTADO' })),
    rejeitarSaque: vi.fn(() => of({ ...SAQUE, status: 'REJEITADO' })),
  };
}

async function abrir(role: UsuarioRole, svc = servico()) {
  const { fixture } = await renderizar(TesourariaPageComponent, svc);
  autenticar(fixture, role);
  await estabilizar(fixture);
  return { fixture, svc };
}

function autenticar(fixture: ComponentFixture<unknown>, role: UsuarioRole): void {
  const auth = fixture.debugElement.injector.get(AuthService) as unknown as {
    currentUserState: { set: (u: unknown) => void };
  };
  auth.currentUserState.set({
    id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771003',
    username: 'operador@empresa.com',
    role,
    mfaHabilitado: true,
    dataCriacao: '2026-04-24T18:30:00-03:00',
    dataModificacao: '2026-04-24T18:30:00-03:00',
    criadoPor: 'system',
    modificadoPor: 'system',
  });
}

describe('TesourariaPageComponent', () => {
  it('mostra o resumo, as oportunidades, as operações, os saques e as divergências', async () => {
    await abrir('FINANCEIRO');

    expect(screen.getAllByText(/20\.000,00/).length).toBeGreaterThan(0);
    expect(screen.getByText('Pronta para desembolso')).toBeTruthy();
    expect(screen.getByText('Formada')).toBeTruthy();
    expect(screen.getByText('8/10')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Repassar parcela 9/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeTruthy();
    expect(screen.getByText(/valor diferente do informado/)).toBeTruthy();
  });

  it('BACKOFFICE acompanha, mas não vê os botões de operação', async () => {
    await abrir('BACKOFFICE');

    expect(screen.queryByRole('button', { name: 'Desembolsar' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Repassar parcela/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Aprovar' })).toBeNull();
    expect(screen.getByText('Pronta para desembolso')).toBeTruthy();
  });

  it('desembolsar envia a oportunidade com Idempotency-Key', async () => {
    const { fixture, svc } = await abrir('FINANCEIRO');

    fireEvent.click(screen.getByRole('button', { name: 'Desembolsar' }));
    await estabilizar(fixture);

    expect(svc.desembolsar).toHaveBeenCalledTimes(1);
    const [oportunidadeId, , chave] = svc.desembolsar.mock.calls[0] as unknown as [
      string,
      string,
      string,
    ];
    expect(oportunidadeId).toBe('op-estrela');
    expect(chave.length).toBeGreaterThan(8);
    expect(screen.getByRole('status').textContent).toContain('Operação formada');
  });

  it('repassar a parcela envia principal e juros da próxima parcela', async () => {
    const { fixture, svc } = await abrir('ADMIN');

    fireEvent.click(screen.getByRole('button', { name: /Repassar parcela 9/ }));
    await estabilizar(fixture);

    expect(svc.repassarParcela).toHaveBeenCalledTimes(1);
    const [operacaoId, numero, valores] = svc.repassarParcela.mock.calls[0] as unknown as [
      string,
      number,
      { principal: number; juros: number },
    ];
    expect(operacaoId).toBe('operacao-beta');
    expect(numero).toBe(9);
    expect(valores).toEqual({ principal: 590, juros: 30 });
  });

  it('encerrar sem formar exige o motivo', async () => {
    const { fixture, svc } = await abrir('FINANCEIRO');

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar sem formar' }));
    await estabilizar(fixture);
    expect(svc.encerrarSemFormar).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('motivo');

    fireEvent.input(screen.getByLabelText(/Motivo/), { target: { value: 'Tomador desistiu' } });
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar sem formar' }));
    await estabilizar(fixture);

    expect(svc.encerrarSemFormar).toHaveBeenCalledWith('op-estrela', 'Tomador desistiu');
  });

  it('aprovar e rejeitar saque chamam o backend', async () => {
    const { fixture, svc } = await abrir('FINANCEIRO');

    fireEvent.click(screen.getByRole('button', { name: 'Aprovar' }));
    await estabilizar(fixture);
    expect(svc.aprovarSaque).toHaveBeenCalledTimes(1);
    expect(svc.aprovarSaque.mock.calls[0]?.[0]).toBe('s-1');

    fireEvent.click(screen.getByRole('button', { name: 'Rejeitar' }));
    await estabilizar(fixture);
    expect(svc.rejeitarSaque).toHaveBeenCalledWith('s-1');
  });
});
