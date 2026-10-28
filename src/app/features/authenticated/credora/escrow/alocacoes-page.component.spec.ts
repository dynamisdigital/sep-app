import { fireEvent, screen } from '@testing-library/angular';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import {
  AlocacaoResponse,
  LimiteDevedorResponse,
  OportunidadeAlocavelResponse,
} from '../../../../core/credores/credores-escrow.models';
import { AlocacoesPageComponent } from './alocacoes-page.component';
import { CONTA, estabilizar, renderizar } from './escrow-teste-util';

const OPORTUNIDADE: OportunidadeAlocavelResponse = {
  id: 'op-1',
  devedorId: 'dev-1',
  devedorNome: 'Padaria Estrela ME',
  valor: 4625,
  alocado: 0,
  faltante: 4625,
  taxaJurosMensal: 0.019,
  prazoMeses: 10,
};

const ALOCACAO: AlocacaoResponse = {
  id: 'al-1',
  credorId: 'credor-1',
  oportunidadeId: 'op-1',
  operacaoId: null,
  devedorId: 'dev-1',
  devedorNome: 'Padaria Estrela ME',
  valor: 4625,
  status: 'RESERVADA',
  motivoLiberacao: null,
  cienciaRiscoEm: '2026-10-05T15:00:00-03:00',
  dataCriacao: '2026-10-05T15:00:00-03:00',
};

const LIMITE: LimiteDevedorResponse = {
  devedorId: 'dev-1',
  limite: 15000,
  isento: false,
  alocado: 4625,
  disponivel: 10375,
};

function servico(limite: LimiteDevedorResponse = LIMITE) {
  return {
    consultarConta: () => of(CONTA),
    listarOportunidadesAlocaveis: () => of([OPORTUNIDADE]),
    listarAlocacoes: () => of([ALOCACAO]),
    consultarLimite: () => of(limite),
    alocar: vi.fn(() => of(ALOCACAO)),
    cancelarAlocacao: vi.fn(() => of(undefined)),
  };
}

describe('AlocacoesPageComponent', () => {
  it('mostra a oportunidade, o limite por devedor e a alocação existente', async () => {
    const { fixture } = await renderizar(AlocacoesPageComponent, servico());
    await estabilizar(fixture);

    expect(screen.getAllByText(/Padaria Estrela ME/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Seu limite com este devedor/)).toBeTruthy();
    expect(screen.getAllByText(/10\.375,00/).length).toBeGreaterThan(0);
    expect(screen.getByText('Reservada')).toBeTruthy();
  });

  it('investidor qualificado aparece como isento do limite', async () => {
    const { fixture } = await renderizar(
      AlocacoesPageComponent,
      servico({ ...LIMITE, isento: true, disponivel: null }),
    );
    await estabilizar(fixture);

    expect(screen.getByText('isento')).toBeTruthy();
  });

  it('sem a ciência de risco não aloca', async () => {
    const svc = servico();
    const { fixture } = await renderizar(AlocacoesPageComponent, svc);
    await estabilizar(fixture);

    fireEvent.input(screen.getByLabelText(/Valor \(R\$\)/), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: /Reservar valor/ }));
    await estabilizar(fixture);

    expect(svc.alocar).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('ciente dos riscos');
  });

  it('com valor e ciência, aloca com Idempotency-Key', async () => {
    const svc = servico();
    const { fixture } = await renderizar(AlocacoesPageComponent, svc);
    await estabilizar(fixture);

    fireEvent.input(screen.getByLabelText(/Valor \(R\$\)/), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Reservar valor/ }));
    await estabilizar(fixture);

    expect(svc.alocar).toHaveBeenCalledTimes(1);
    const [pedido, chave] = svc.alocar.mock.calls[0] as unknown as [
      { oportunidadeId: string; valor: number; cienciaRisco: boolean },
      string,
    ];
    expect(pedido).toEqual({ oportunidadeId: 'op-1', valor: 1000, cienciaRisco: true });
    expect(chave.length).toBeGreaterThan(8);
  });

  it('reserva pode ser cancelada enquanto está reservada', async () => {
    const svc = servico();
    const { fixture } = await renderizar(AlocacoesPageComponent, svc);
    await estabilizar(fixture);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await estabilizar(fixture);

    expect(svc.cancelarAlocacao).toHaveBeenCalledWith('al-1');
  });
});
