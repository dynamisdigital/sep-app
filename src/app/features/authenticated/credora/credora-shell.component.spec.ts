import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { Observable, of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { EmpresaCredoraResponse } from '../../../core/api/api.models';
import { CredoraService } from '../../../core/credora/credora.service';
import { CredoraShellComponent } from './credora-shell.component';

const CREDORA: EmpresaCredoraResponse = {
  id: 'cr-1',
  usuarioId: 'u-1',
  onboardingId: 'ob-1',
  cnpj: '12.345.678/0001-90',
  razaoSocial: 'Credora Exemplo Ltda',
  status: 'ATIVA',
  elegibilidade: 'ELEGIVEL',
  motivoInelegibilidade: null,
  tipoCredora: 'EMPRESA',
  capacidadeAporte: 100000,
  dataCriacao: '2026-05-28T12:00:00-03:00',
  dataModificacao: '2026-05-28T12:00:00-03:00',
};

async function renderShell(consultarMinhaCredora: () => Observable<EmpresaCredoraResponse>) {
  await render(CredoraShellComponent, {
    providers: [
      provideRouter([]),
      { provide: CredoraService, useValue: { consultarMinhaCredora } },
    ],
  });
}

describe('CredoraShellComponent', () => {
  it('com credora: navega para perfil, oportunidades e carteira', async () => {
    await renderShell(() => of(CREDORA));

    expect(screen.getByText('Perfil e elegibilidade').closest('a')?.getAttribute('href')).toBe(
      '/app/credora/perfil',
    );
    expect(screen.getByText('Oportunidades').closest('a')?.getAttribute('href')).toBe(
      '/app/credora/oportunidades',
    );
    expect(screen.getByText('Carteira').closest('a')?.getAttribute('href')).toBe(
      '/app/credora/carteira',
    );
    expect(screen.queryByText('Cadastrar credora')).toBeNull();
  });

  it('sem credora (404): oferece apenas o cadastro, sem cards da jornada', async () => {
    await renderShell(() => throwError(() => new HttpErrorResponse({ status: 404 })));

    expect(screen.getByText('Cadastrar credora').closest('a')?.getAttribute('href')).toBe(
      '/app/credora/cadastro',
    );
    expect(screen.queryByText('Perfil e elegibilidade')).toBeNull();
    expect(screen.queryByText('Oportunidades')).toBeNull();
  });

  it('erro nao-404: mostra mensagem de falha e nenhum card', async () => {
    await renderShell(() => throwError(() => new HttpErrorResponse({ status: 500 })));

    expect(
      screen.getByText('Nao foi possivel carregar sua credora. Tente novamente.'),
    ).toBeTruthy();
    expect(screen.queryByText('Perfil e elegibilidade')).toBeNull();
    expect(screen.queryByText('Cadastrar credora')).toBeNull();
  });
});
