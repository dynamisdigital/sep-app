import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { describe, expect, it } from 'vitest';

import { UsuarioResponse, UsuarioRole } from '../../../core/api/api.models';
import { AuthService } from '../../../core/auth/auth.service';
import { LUCIDE_ICONS } from '../../../core/icons/lucide-icons';
import { DashboardComponent } from './dashboard.component';

function usuario(role: UsuarioRole): UsuarioResponse {
  return {
    id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771001',
    username: `${role.toLowerCase()}@empresa.com`,
    role,
    dataCriacao: '2026-05-28T12:00:00-03:00',
    dataModificacao: '2026-05-28T12:00:00-03:00',
    criadoPor: 'system',
    modificadoPor: 'system',
    precisaRedefinirSenha: false,
    mfaHabilitado: true,
  };
}

function renderDashboard(atual: UsuarioResponse | null) {
  return render(DashboardComponent, {
    providers: [
      provideRouter([]),
      provideHttpClient(),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      { provide: AuthService, useValue: { currentUser: signal(atual).asReadonly() } },
    ],
  });
}

function atalho(rotulo: string): HTMLAnchorElement | null {
  return screen.getByText(rotulo, { selector: '.px48-no strong' }).closest('a');
}

describe('DashboardComponent', () => {
  it('saúda o usuário da sessão e mostra o papel', async () => {
    await renderDashboard(usuario('ADMIN'));

    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('admin@empresa.com');
    expect(screen.getByText('ADMIN', { selector: '.px48-selo' })).toBeTruthy();
  });

  // Os atalhos seguem a mesma regra de papel do menu: a tela nunca oferece um caminho que o
  // usuário não pode percorrer.
  it('ADMIN vê operação e administração', async () => {
    await renderDashboard(usuario('ADMIN'));

    expect(atalho('Administração')?.getAttribute('href')).toBe('/app/admin');
    expect(atalho('Backoffice')?.getAttribute('href')).toBe('/app/backoffice');
    expect(atalho('Pix')?.getAttribute('href')).toBe('/app/pix');
    expect(screen.queryByText('Credora', { selector: '.px48-no strong' })).toBeNull();
  });

  it('CLIENTE vê a jornada credora e não vê operação nem administração', async () => {
    await renderDashboard(usuario('CLIENTE'));

    expect(atalho('Credora')?.getAttribute('href')).toBe('/app/credora');
    expect(screen.queryByText('Administração', { selector: '.px48-no strong' })).toBeNull();
    expect(screen.queryByText('Backoffice', { selector: '.px48-no strong' })).toBeNull();
    expect(screen.queryByText('Pix', { selector: '.px48-no strong' })).toBeNull();
  });

  it('as jornadas comuns aparecem para qualquer papel', async () => {
    await renderDashboard(usuario('FINANCEIRO'));

    expect(atalho('Onboarding')?.getAttribute('href')).toBe('/app/onboarding');
    expect(atalho('Crédito')?.getAttribute('href')).toBe('/app/credito');
    expect(atalho('Formalização')?.getAttribute('href')).toBe('/app/formalizacao');
    expect(atalho('Cobrança')?.getAttribute('href')).toBe('/app/cobranca');
  });

  it('os atalhos de conta apontam para perfil e troca de senha', async () => {
    await renderDashboard(usuario('CLIENTE'));

    expect(atalho('Meu perfil')?.getAttribute('href')).toBe('/app/profile');
    expect(atalho('Alterar senha')?.getAttribute('href')).toBe('/app/profile/change-password');
  });

  it('sem usuário na sessão, a saudação não quebra e some o selo de papel', async () => {
    await renderDashboard(null);

    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    expect(screen.queryByText('ADMIN', { selector: '.px48-selo' })).toBeNull();
  });
});
