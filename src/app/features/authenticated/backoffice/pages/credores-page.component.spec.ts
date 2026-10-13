import { fireEvent, screen } from '@testing-library/angular';
import { of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';

import {
  CredorGestaoResponse,
  SaldoEscrow,
} from '../../../../core/credores/credores-escrow.models';
import { erroHttp, estabilizar, renderizar } from '../../credora/escrow/escrow-teste-util';
import { CredoresPageComponent } from './credores-page.component';

const SALDO: SaldoEscrow = {
  disponivel: 1500,
  reservado: 0,
  emOperacao: 0,
  totalCustodiado: 1500,
  patrimonio: 1500,
};

function credor(parcial: Partial<CredorGestaoResponse>): CredorGestaoResponse {
  return {
    id: 'c-1',
    nome: 'Credor Exemplo',
    documentoMascarado: '***.123.456-**',
    tipoPessoa: 'PF',
    categoria: 'NAO_QUALIFICADO',
    perfilRisco: 'MODERADO',
    status: 'ATIVO',
    motivoStatus: null,
    termoQualificadoEm: null,
    cienciaRiscoEm: '2026-09-01T10:00:00-03:00',
    capacidadeAporte: 20000,
    saldo: SALDO,
    dataCadastro: '2026-09-01T10:00:00-03:00',
    ...parcial,
  };
}

const CREDORES = [
  credor({ id: 'c-1', nome: 'Helena Martins', status: 'ATIVO' }),
  credor({
    id: 'c-2',
    nome: 'Marina Duarte',
    status: 'EM_ANALISE',
    perfilRisco: null,
    saldo: { ...SALDO, patrimonio: 0 },
  }),
  credor({ id: 'c-3', nome: 'Boreal Fomento', tipoPessoa: 'PJ', status: 'REPROVADO' }),
];

describe('CredoresPageComponent', () => {
  it('lista os credores e avisa quantos cadastros aguardam análise', async () => {
    const { fixture } = await renderizar(CredoresPageComponent, {
      listarCredores: () => of(CREDORES),
    });
    await estabilizar(fixture);

    expect(screen.getByText('Helena Martins')).toBeTruthy();
    expect(screen.getByText('Marina Duarte')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('1 cadastro aguarda análise');
    expect(screen.getByText('Pessoa jurídica')).toBeTruthy();
  });

  it('o filtro mostra só os credores da situação escolhida, com contagem', async () => {
    const { fixture } = await renderizar(CredoresPageComponent, {
      listarCredores: () => of(CREDORES),
    });
    await estabilizar(fixture);

    fireEvent.click(screen.getByRole('button', { name: /Em análise \(1\)/ }));
    await estabilizar(fixture);

    expect(screen.getByText('Marina Duarte')).toBeTruthy();
    expect(screen.queryByText('Helena Martins')).toBeNull();
    expect(screen.queryByText('Boreal Fomento')).toBeNull();
  });

  it('cada credor leva ao seu detalhe', async () => {
    const { fixture } = await renderizar(CredoresPageComponent, {
      listarCredores: () => of(CREDORES),
    });
    await estabilizar(fixture);

    const links = screen.getAllByRole('link', { name: 'Abrir' });
    expect(links[0]?.getAttribute('href')).toBe('/app/backoffice/credores/c-1');
  });

  it('erro mostra a mensagem e oferece nova tentativa', async () => {
    const { fixture } = await renderizar(CredoresPageComponent, {
      listarCredores: () => throwError(() => erroHttp(500)),
    });
    await estabilizar(fixture);

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Tentar novamente/ })).toBeTruthy();
  });
});
