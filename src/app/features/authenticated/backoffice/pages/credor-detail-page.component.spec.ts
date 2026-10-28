import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { fireEvent, screen } from '@testing-library/angular';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { UsuarioRole } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  CredorGestaoResponse,
  EventoAuditoriaCredor,
  LancamentoEscrow,
} from '../../../../core/credores/credores-escrow.models';
import { erroHttp, estabilizar, renderizar } from '../../credora/escrow/escrow-teste-util';
import { CredorDetailPageComponent } from './credor-detail-page.component';

const CREDOR: CredorGestaoResponse = {
  id: 'c-2',
  nome: 'Marina Duarte',
  documentoMascarado: '***.987.654-**',
  tipoPessoa: 'PF',
  categoria: 'NAO_QUALIFICADO',
  perfilRisco: null,
  status: 'EM_ANALISE',
  motivoStatus: null,
  termoQualificadoEm: null,
  cienciaRiscoEm: null,
  capacidadeAporte: 8000,
  saldo: { disponivel: 0, reservado: 0, emOperacao: 0, totalCustodiado: 0, patrimonio: 0 },
  dataCadastro: '2026-10-08T10:00:00-03:00',
};

const EXTRATO: LancamentoEscrow[] = [
  {
    id: 'l-1',
    credorId: 'c-2',
    tipo: 'APORTE',
    valor: 500,
    de: 'EXTERNO',
    para: 'DISPONIVEL',
    operacaoId: null,
    parcela: null,
    descricao: 'Aporte via Pix',
    dataLancamento: '2026-10-09T10:00:00-03:00',
  },
];

const AUDITORIA: EventoAuditoriaCredor[] = [
  {
    id: 'e-1',
    credorId: 'c-2',
    tipo: 'CADASTRO',
    autor: 'marina@empresa.com',
    papel: 'CLIENTE',
    descricao: 'Cadastro enviado para análise',
    data: '2026-10-08T10:00:00-03:00',
  },
];

function servico(credor: CredorGestaoResponse = CREDOR) {
  return {
    consultarCredor: () => of(credor),
    listarExtratoDoCredor: () => of(EXTRATO),
    listarAuditoria: () => of(AUDITORIA),
    alterarStatus: vi.fn(() => of({ ...credor, status: 'ATIVO' as const })),
    alterarPerfilRisco: vi.fn(() => of(credor)),
    alterarCategoria: vi.fn(() => of(credor)),
  };
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

async function abrir(role: UsuarioRole, svc: ReturnType<typeof servico> = servico()) {
  const { fixture } = await renderizar(CredorDetailPageComponent, svc, [
    {
      provide: ActivatedRoute,
      useValue: { snapshot: { paramMap: convertToParamMap({ id: 'c-2' }) } },
    },
  ]);
  autenticar(fixture, role);
  await estabilizar(fixture);
  return { fixture, svc };
}

describe('CredorDetailPageComponent', () => {
  it('mostra o cadastro, o extrato e a auditoria', async () => {
    await abrir('BACKOFFICE');

    expect(screen.getByRole('heading', { name: 'Marina Duarte' })).toBeTruthy();
    expect(screen.getByText('Em análise')).toBeTruthy();
    expect(screen.getByText('Aporte via Pix')).toBeTruthy();
    expect(screen.getByText('Cadastro enviado para análise')).toBeTruthy();
  });

  it('FINANCEIRO só consulta: não vê as ações de gestão', async () => {
    await abrir('FINANCEIRO');

    expect(screen.queryByRole('button', { name: 'Aprovar cadastro' })).toBeNull();
    expect(screen.getByText(/Somente o Backoffice e a Administração/)).toBeTruthy();
  });

  it('aprovar sem motivo não chama o backend', async () => {
    const { fixture, svc } = await abrir('BACKOFFICE');

    fireEvent.click(screen.getByRole('button', { name: 'Aprovar cadastro' }));
    await estabilizar(fixture);

    expect(svc.alterarStatus).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('motivo');
  });

  it('aprovar com motivo envia o novo status e o motivo', async () => {
    const { fixture, svc } = await abrir('ADMIN');

    fireEvent.input(screen.getByLabelText('Motivo da decisão'), {
      target: { value: 'Documentos conferidos' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar cadastro' }));
    await estabilizar(fixture);

    expect(svc.alterarStatus).toHaveBeenCalledWith('c-2', {
      status: 'ATIVO',
      motivo: 'Documentos conferidos',
    });
    expect(screen.getByRole('status').textContent).toContain('atualizada');
  });

  it('credor ativo pode ser suspenso e suspenso pode ser reativado', async () => {
    await abrir('BACKOFFICE', servico({ ...CREDOR, status: 'ATIVO' }));
    expect(screen.getByRole('button', { name: 'Suspender' })).toBeTruthy();
  });

  it('suspenso oferece reativar', async () => {
    await abrir('BACKOFFICE', servico({ ...CREDOR, status: 'SUSPENSO' }));
    expect(screen.getByRole('button', { name: 'Reativar' })).toBeTruthy();
  });

  it('qualificar sem termo mostra o erro do backend', async () => {
    const svc = servico();
    svc.alterarCategoria = vi.fn(() => throwError(() => erroHttp(422)));
    const { fixture } = await abrir('BACKOFFICE', svc);

    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'QUALIFICADO' } });
    await estabilizar(fixture);

    expect(svc.alterarCategoria).toHaveBeenCalledWith('c-2', 'QUALIFICADO');
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('credor inexistente mostra "não encontrado"', async () => {
    const { fixture } = await renderizar(
      CredorDetailPageComponent,
      {
        consultarCredor: () => throwError(() => erroHttp(404)),
        listarExtratoDoCredor: () => of([]),
        listarAuditoria: () => of([]),
      },
      [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'x' }) } },
        },
      ],
    );
    await estabilizar(fixture);

    expect(screen.getByRole('alert').textContent).toContain('não encontrado');
  });
});
