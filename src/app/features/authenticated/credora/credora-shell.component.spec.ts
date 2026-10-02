import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { Observable, of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { EmpresaCredoraResponse } from '../../../core/api/api.models';
import { CredoraService } from '../../../core/credora/credora.service';
import { LUCIDE_ICONS } from '../../../core/icons/lucide-icons';
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
      provideHttpClient(),
      provideRouter([]),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      { provide: CredoraService, useValue: { consultarMinhaCredora } },
    ],
  });
}

describe('CredoraShellComponent — Mockup 35', () => {
  // 404 é o estado desejado da tela, não erro: o usuário ainda não tem credora.
  it('sem credora, convida ao cadastro e explica por quê', async () => {
    await renderShell(() =>
      throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' })),
    );

    expect(
      screen.getByRole('heading', { name: /Você ainda não tem uma empresa credora cadastrada/ }),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: /Cadastrar credora/ }).getAttribute('href')).toBe(
      '/app/credora/cadastro',
    );
    expect(document.querySelectorAll('.px35-motivo')).toHaveLength(4);
    expect(screen.getByText(/cumprimento regulatório/)).toBeTruthy();
  });

  it('sem credora, não oferece os atalhos da jornada', async () => {
    await renderShell(() =>
      throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' })),
    );

    expect(document.querySelector('.px35-atalhos')).toBeNull();
    expect(screen.queryByRole('link', { name: /Oportunidades/ })).toBeNull();
  });

  it('com credora, mostra a empresa e libera os três atalhos', async () => {
    await renderShell(() => of(CREDORA));

    expect(screen.getByText('Credora Exemplo Ltda')).toBeTruthy();
    expect(screen.getByText('12.345.678/0001-90')).toBeTruthy();
    expect(screen.getByText('ATIVA')).toBeTruthy();

    const atalhos = Array.from(document.querySelectorAll('.px35-atalho')).map((a) =>
      a.getAttribute('href'),
    );
    expect(atalhos).toEqual([
      '/app/credora/perfil',
      '/app/credora/oportunidades',
      '/app/credora/carteira',
    ]);
    expect(document.querySelector('.px35-vazio')).toBeNull();
  });

  it('erro que não seja 404 mostra a falha e oferece nova tentativa', async () => {
    await renderShell(() =>
      throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Server Error' })),
    );

    expect(screen.getByRole('alert').textContent).toContain(
      'Não foi possível carregar sua credora',
    );
    expect(screen.getByRole('button', { name: /Tentar novamente/ })).toBeTruthy();
    expect(document.querySelector('.px35-vazio')).toBeNull();
  });
});
