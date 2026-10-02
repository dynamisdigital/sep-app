import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { render } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { UsuarioResponse, UsuarioRole } from '../../core/api/api.models';
import { AuthService } from '../../core/auth/auth.service';
import { LUCIDE_ICONS } from '../../core/icons/lucide-icons';
import { OperationalShellComponent } from './operational-shell.component';

function usuario(role: UsuarioRole): UsuarioResponse {
  return {
    id: `id-${role}`,
    username: `${role.toLowerCase()}@empresa.com`,
    role,
    dataCriacao: '2026-04-24T18:30:00-03:00',
    dataModificacao: '2026-04-24T18:30:00-03:00',
    criadoPor: 'system',
    modificadoPor: 'system',
    precisaRedefinirSenha: false,
    mfaHabilitado: true,
  };
}

async function montar(role: UsuarioRole, url = '/app/dashboard') {
  const authFalso = { currentUser: signal(usuario(role)).asReadonly() };
  const result = await render(OperationalShellComponent, {
    providers: [
      provideRouter([]),
      provideHttpClient(),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      { provide: AuthService, useValue: authFalso },
    ],
  });
  // A URL corrente do shell e um signal proprio, alimentado por NavigationEnd; nos testes ela
  // e ajustada direto, sem depender de navegacao real.
  (
    result.fixture.componentInstance as unknown as { urlAtual: { set(v: string): void } }
  ).urlAtual.set(url);
  result.fixture.detectChanges();
  return result;
}

function rotasDoMenu(): string[] {
  return Array.from(document.querySelectorAll('.op-nav a[href]')).map(
    (e) => e.getAttribute('href') ?? '',
  );
}

describe('OperationalShellComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // O menu e a unica porta de entrada das telas: uma rota estatica fora dele so seria alcancavel
  // por link interno ou pela barra de enderecos.
  it('o menu desce ate o terceiro nivel do ramo corrente', async () => {
    await montar('ADMIN', '/app/backoffice/reprocessos/provider');
    const rotas = rotasDoMenu();

    expect(rotas).toContain('/app/backoffice');
    expect(rotas).toContain('/app/backoffice/reprocessos');
    expect(rotas).toContain('/app/backoffice/reprocessos/provider');
    expect(rotas).toContain('/app/backoffice/reprocessos/webhook');
  });

  it('ADMIN alcanca os dois modulos de Administracao', async () => {
    await montar('ADMIN', '/app/admin/users');
    const rotas = rotasDoMenu();

    expect(rotas).toContain('/app/admin/users');
    expect(rotas).toContain('/app/admin/parametros');
  });

  it('BACKOFFICE nao ve Administracao', async () => {
    await montar('BACKOFFICE');
    expect(rotasDoMenu()).not.toContain('/app/admin');
  });

  // A credora investe; onboarding de tomador, esteira de credito, formalizacao e cobranca sao
  // trabalho de operacao e ficam atras de roleGuard. O menu espelha exatamente esses guards.
  it('CLIENTE ve so a jornada da credora', async () => {
    await montar('CLIENTE');
    const rotas = rotasDoMenu();
    expect(rotas).toEqual(['/app/dashboard', '/app/credora', '/app/profile']);
  });

  // Poda no meio da arvore: o BACKOFFICE opera a Cobranca, mas a agenda financeira e a
  // inadimplencia sao do FINANCEIRO. O item de topo fica e os dois filhos somem.
  it('poda tambem os filhos, e nao so o item de topo', async () => {
    await montar('BACKOFFICE', '/app/cobranca');
    const rotas = rotasDoMenu();
    expect(rotas).toContain('/app/cobranca');
    expect(rotas).not.toContain('/app/cobranca/financeiro/agenda');
    expect(rotas).not.toContain('/app/cobranca/financeiro/inadimplencia');
  });

  it('marca um unico selecionado, e os ancestrais como ramo', async () => {
    await montar('ADMIN', '/app/backoffice/reprocessos/provider');

    const selecionados = Array.from(
      document.querySelectorAll('.op-nav-link-active, .op-subnav-link-active'),
    ).map((e) => (e.textContent ?? '').trim());
    const ramos = Array.from(
      document.querySelectorAll('.op-nav-link-ramo, .op-subnav-link-ramo'),
    ).map((e) => (e.textContent ?? '').trim());

    expect(selecionados).toEqual(['Provider']);
    expect(ramos.sort()).toEqual(['Backoffice', 'Reprocessos']);
  });

  it('cada item carrega o proprio tom para o glow do hover', async () => {
    await montar('ADMIN');
    const cobranca = Array.from(document.querySelectorAll('.op-nav-group > .op-nav-link')).find(
      (e) => (e.textContent ?? '').includes('Cobrança'),
    ) as HTMLElement;
    expect(cobranca.style.getPropertyValue('--glow')).toBe('var(--sep-tint-amber)');
  });
});
