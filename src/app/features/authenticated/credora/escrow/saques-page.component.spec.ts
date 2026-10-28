import { fireEvent, screen } from '@testing-library/angular';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import {
  DestinatarioResponse,
  SaqueResponse,
} from '../../../../core/credores/credores-escrow.models';
import { CONTA, estabilizar, renderizar } from './escrow-teste-util';
import { SaquesPageComponent } from './saques-page.component';

const DESTINATARIO: DestinatarioResponse = {
  id: 'd-1',
  titularNome: 'Helena Martins',
  titularDocumentoMascarado: '***.456.789-**',
  banco: 'Nubank (260)',
  agencia: '0001',
  contaMascarada: '****56-7',
  tipoConta: 'PAGAMENTO',
  mesmaTitularidade: true,
  dataCriacao: '2026-10-01T10:00:00-03:00',
};

const SAQUE: SaqueResponse = {
  id: 's-1',
  credorId: 'credor-1',
  destinatarioId: 'd-1',
  valor: 300,
  status: 'AGUARDANDO_APROVACAO',
  dataCriacao: '2026-10-09T10:00:00-03:00',
};

function servico() {
  return {
    consultarConta: () => of(CONTA),
    listarDestinatarios: () => of([DESTINATARIO]),
    listarSaques: () => of([SAQUE]),
    solicitarSaque: vi.fn(() => of(SAQUE)),
    criarDestinatario: vi.fn(() => of(DESTINATARIO)),
    removerDestinatario: vi.fn(() => of(undefined)),
  };
}

describe('SaquesPageComponent', () => {
  it('mostra o saldo disponível, a conta de destino e o histórico', async () => {
    const { fixture } = await renderizar(SaquesPageComponent, servico());
    await estabilizar(fixture);

    expect(screen.getAllByText(/1\.500,00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Nubank \(260\)/).length).toBeGreaterThan(0);
    expect(screen.getByText('Aguardando aprovação')).toBeTruthy();
  });

  it('sacar com valor válido envia destinatário, valor e Idempotency-Key', async () => {
    const svc = servico();
    const { fixture } = await renderizar(SaquesPageComponent, svc);
    await estabilizar(fixture);

    fireEvent.input(screen.getByLabelText(/Valor \(R\$\)/), { target: { value: '300,00' } });
    fireEvent.click(screen.getByRole('button', { name: /Solicitar saque/ }));
    await estabilizar(fixture);

    expect(svc.solicitarSaque).toHaveBeenCalledTimes(1);
    const [pedido, chave] = svc.solicitarSaque.mock.calls[0] as unknown as [
      { destinatarioId: string; valor: number },
      string,
    ];
    expect(pedido).toEqual({ destinatarioId: 'd-1', valor: 300 });
    expect(chave.length).toBeGreaterThan(8);
    expect(screen.getByRole('status').textContent).toContain('aprovação');
  });

  it('valor inválido não chama o backend', async () => {
    const svc = servico();
    const { fixture } = await renderizar(SaquesPageComponent, svc);
    await estabilizar(fixture);

    fireEvent.input(screen.getByLabelText(/Valor \(R\$\)/), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /Solicitar saque/ }));
    await estabilizar(fixture);

    expect(svc.solicitarSaque).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('valor válido');
  });

  it('cadastrar conta exige banco, agência e conta', async () => {
    const svc = servico();
    const { fixture } = await renderizar(SaquesPageComponent, svc);
    await estabilizar(fixture);

    fireEvent.click(screen.getByRole('button', { name: /Cadastrar conta de destino/ }));
    await estabilizar(fixture);

    expect(svc.criarDestinatario).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('banco, agência e conta');
  });
});
