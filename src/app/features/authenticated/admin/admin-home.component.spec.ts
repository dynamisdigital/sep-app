import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { Observable, of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { ParametroOperacional, UsuarioResponse } from '../../../core/api/api.models';
import { GovernancaService } from '../../../core/governanca/governanca.service';
import { LUCIDE_ICONS } from '../../../core/icons/lucide-icons';
import { UsuariosService } from '../../../core/users/usuarios.service';
import { AdminHomeComponent } from './admin-home.component';

function usuario(id: string, role: UsuarioResponse['role']): UsuarioResponse {
  return {
    id,
    username: `${id}@empresa.com`,
    role,
    dataCriacao: '2026-05-28T12:00:00-03:00',
    dataModificacao: '2026-05-28T12:00:00-03:00',
    criadoPor: 'system',
    modificadoPor: 'system',
    precisaRedefinirSenha: false,
    mfaHabilitado: true,
  };
}

function parametro(chave: string, versao: number, ativo = true): ParametroOperacional {
  return {
    id: chave,
    chave,
    tipo: 'INTEGER',
    valor: '10',
    descricao: chave,
    ativo,
    versao,
    dataModificacao: '2026-05-28T12:00:00-03:00',
  };
}

const USUARIOS = [usuario('a', 'ADMIN'), usuario('b', 'CLIENTE'), usuario('c', 'CLIENTE')];
const PARAMETROS = [parametro('x', 1), parametro('y', 3), parametro('z', 2, false)];

async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

async function estabilizar(fixture: ComponentFixture<unknown>): Promise<void> {
  await fixture.whenStable();
  await flush();
  fixture.detectChanges();
}

function renderPagina(
  listar: () => Observable<UsuarioResponse[]> = () => of(USUARIOS),
  listarParametros: () => Observable<ParametroOperacional[]> = () => of(PARAMETROS),
) {
  return render(AdminHomeComponent, {
    providers: [
      provideRouter([]),
      provideHttpClient(),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      { provide: UsuariosService, useValue: { listar } },
      { provide: GovernancaService, useValue: { listarParametros } },
    ],
  });
}

describe('AdminHomeComponent', () => {
  it('mostra os módulos de Usuários e Parâmetros operacionais', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    expect(screen.getByRole('heading', { name: 'Usuários' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Parâmetros operacionais' })).toBeTruthy();
  });

  it('cada módulo leva à sua rota', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    const links = screen.getAllByRole('link', { name: /Acessar módulo/ });
    expect(links[0].getAttribute('href')).toBe('/app/admin/users');
    expect(links[1].getAttribute('href')).toBe('/app/admin/parametros');
  });

  // Os números do resumo saem das próprias listas devolvidas, para fecharem com as telas de
  // destino. Parâmetro na versão N acumulou N-1 alterações na trilha auditável.
  it('resumo soma usuários, parâmetros ativos e alterações das listas devolvidas', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    expect(screen.getByText('Usuários ativos').parentElement?.textContent).toContain('3');
    expect(screen.getByText('Parâmetros').parentElement?.textContent).toContain('2');
    expect(screen.getByText('Alterações registradas').parentElement?.textContent).toContain('3');
    expect(screen.getByText('2 papéis em uso')).toBeTruthy();
  });

  it('métrica sem endpoint aparece como travessão, com o motivo', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    const permissoes = screen.getByText('Permissões').parentElement;
    expect(permissoes?.textContent).toContain('—');
    expect(screen.getByText('sem endpoint de catálogo')).toBeTruthy();
  });

  it('o atalho Novo usuário abre o cadastro', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    const novoUsuario = screen.getByText('Novo usuário').closest('a');
    expect(novoUsuario?.getAttribute('href')).toBe('/app/admin/users/novo');
  });

  it('atalhos sem endpoint ficam inertes, com o motivo no título', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    const exportar = screen.getByText('Exportar relatórios').closest('.px37-atalho');
    expect(exportar?.classList.contains('px37-atalho-inerte')).toBe(true);
  });

  it('erro 403 mostra a mensagem da governança e oferece nova tentativa', async () => {
    const { fixture } = await renderPagina(() =>
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );
    await estabilizar(fixture);

    expect(screen.getByText('Apenas ADMIN acessa a governança.')).toBeTruthy();
    expect(screen.getByText('Tentar novamente')).toBeTruthy();
  });

  it('erro genérico mostra a mensagem do resumo', async () => {
    const { fixture } = await renderPagina(
      () => of(USUARIOS),
      () => throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    await estabilizar(fixture);

    expect(screen.getByText('Não foi possível carregar o resumo do sistema.')).toBeTruthy();
  });
});
