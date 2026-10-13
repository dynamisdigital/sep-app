import { fireEvent, screen } from '@testing-library/angular';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AporteResponse, LancamentoEscrow } from '../../../../core/credores/credores-escrow.models';
import { ContaEscrowPageComponent } from './conta-escrow-page.component';
import { CONTA, erroHttp, estabilizar, renderizar } from './escrow-teste-util';

const LANCAMENTO: LancamentoEscrow = {
  id: 'l-1',
  credorId: 'credor-1',
  tipo: 'APORTE',
  valor: 5000,
  de: 'EXTERNO',
  para: 'DISPONIVEL',
  operacaoId: null,
  parcela: null,
  descricao: 'Aporte via Pix',
  dataLancamento: '2026-10-05T10:00:00-03:00',
};

const APORTE_PENDENTE: AporteResponse = {
  id: 'a-1',
  credorId: 'credor-1',
  valor: 800,
  status: 'AGUARDANDO_PIX',
  pixCopiaECola: '00020126-pix-ficticio',
  expiraEm: '2026-10-11T10:00:00-03:00',
  dataCriacao: '2026-10-10T10:00:00-03:00',
  dataConfirmacao: null,
};

function servico(sobrescrever: Record<string, unknown> = {}) {
  return {
    consultarConta: () => of(CONTA),
    listarExtrato: () => of([LANCAMENTO]),
    listarAportes: () => of([APORTE_PENDENTE]),
    criarAporte: vi.fn(() => of(APORTE_PENDENTE)),
    simularConfirmacaoAporte: vi.fn(() => of({ ...APORTE_PENDENTE, status: 'CONFIRMADO' })),
    ...sobrescrever,
  };
}

describe('ContaEscrowPageComponent', () => {
  it('mostra o saldo por bucket, o aporte pendente e o extrato', async () => {
    const { fixture } = await renderizar(ContaEscrowPageComponent, servico());
    await estabilizar(fixture);

    expect(screen.getByText('Disponível')).toBeTruthy();
    expect(screen.getAllByText(/1\.500,00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/4\.625,00/).length).toBeGreaterThan(0);
    expect(screen.getByText('00020126-pix-ficticio')).toBeTruthy();
    expect(screen.getByText('Aporte via Pix')).toBeTruthy();
    expect(screen.getByText(/\+\s*R\$\s*5\.000,00/)).toBeTruthy();
  });

  it('valor inválido mostra erro e não chama o backend', async () => {
    const svc = servico();
    const { fixture } = await renderizar(ContaEscrowPageComponent, svc);
    await estabilizar(fixture);

    fireEvent.input(screen.getByLabelText(/Valor do aporte/), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: /Gerar Pix de aporte/ }));
    await estabilizar(fixture);

    expect(screen.getByRole('alert').textContent).toContain('valor válido');
    expect(svc.criarAporte).not.toHaveBeenCalled();
  });

  it('valor válido cria o aporte com Idempotency-Key e recarrega', async () => {
    const svc = servico();
    const { fixture } = await renderizar(ContaEscrowPageComponent, svc);
    await estabilizar(fixture);

    fireEvent.input(screen.getByLabelText(/Valor do aporte/), { target: { value: '1.200,50' } });
    fireEvent.click(screen.getByRole('button', { name: /Gerar Pix de aporte/ }));
    await estabilizar(fixture);

    expect(svc.criarAporte).toHaveBeenCalledTimes(1);
    const [valor, chave] = svc.criarAporte.mock.calls[0] as unknown as [number, string];
    expect(valor).toBe(1200.5);
    expect(chave.length).toBeGreaterThan(8);
  });

  it('404 explica que ainda não há cadastro de credor', async () => {
    const { fixture } = await renderizar(
      ContaEscrowPageComponent,
      servico({ consultarConta: () => throwError(() => erroHttp(404)) }),
    );
    await estabilizar(fixture);

    expect(screen.getByRole('alert').textContent).toContain('cadastro de credor');
  });
});
