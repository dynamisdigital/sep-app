import { render, screen } from '@testing-library/angular';
import { Subject } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { AporteCredoraResponse } from '../../../../core/api/api.models';
import { CredoraService } from '../../../../core/credora/credora.service';
import { AportesListComponent } from './aportes-list.component';
import { estabilizar } from '../../../../../testing/estabilizar';

const OPERACAO_ID = '7f0799c0-98b9-6d9d-bc4a-7d6f5b78c001';

function aporte(id: string, valor: number): AporteCredoraResponse {
  return {
    id,
    operacaoId: OPERACAO_ID,
    status: 'PENDENTE',
    valor,
    dataCriacao: '2026-07-16T10:00:00-03:00',
    dataAtualizacao: '2026-07-16T10:00:00-03:00',
  };
}

describe('AportesListComponent', () => {
  it('atualizar durante consulta em andamento substitui a consulta: o refresh nunca e perdido', async () => {
    // Subjects controlados: a 1a consulta fica pendente enquanto a 2a e disparada.
    const consultas: Subject<AporteCredoraResponse[]>[] = [];
    const listarAportes = () => {
      const s = new Subject<AporteCredoraResponse[]>();
      consultas.push(s);
      return s.asObservable();
    };
    const { fixture } = await render(AportesListComponent, {
      inputs: { operacaoId: OPERACAO_ID },
      providers: [{ provide: CredoraService, useValue: { listarAportes } }],
    });
    const componente = fixture.componentInstance as AportesListComponent;
    expect(consultas.length).toBe(1);

    // Refresh programatico (pos-registro de aporte) com a 1a consulta ainda em voo.
    componente.atualizar();
    expect(consultas.length).toBe(2);

    // A 2a consulta (mais nova) resolve com o dado atualizado.
    consultas[1].next([aporte('aporte-novo', 25000)]);
    consultas[1].complete();
    await estabilizar(fixture);

    expect(screen.getByText(/25\.000,00/)).toBeTruthy();

    // Resposta tardia da consulta substituida nao sobrescreve o dado mais novo.
    consultas[0].next([aporte('aporte-velho', 999)]);
    consultas[0].complete();
    await estabilizar(fixture);

    expect(screen.getByText(/25\.000,00/)).toBeTruthy();
    expect(screen.queryByText(/999,00/)).toBeNull();
  });
});
