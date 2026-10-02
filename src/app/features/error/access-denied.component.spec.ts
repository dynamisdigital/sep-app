import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { UsuarioResponse, UsuarioRole } from '../../core/api/api.models';
import { AuthService } from '../../core/auth/auth.service';
import { LUCIDE_ICONS } from '../../core/icons/lucide-icons';
import { AccessDeniedComponent } from './access-denied.component';

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

async function montar(user: UsuarioResponse | null) {
  return render(AccessDeniedComponent, {
    providers: [
      provideRouter([]),
      provideHttpClient(),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      { provide: AuthService, useValue: { currentUser: signal(user).asReadonly() } },
    ],
  });
}

describe('AccessDeniedComponent — Mockup 42', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('mostra o codigo, o titulo e a explicacao do desenho', async () => {
    await montar(usuario('CLIENTE'));

    expect(screen.getByText('403')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Acesso negado' })).toBeTruthy();
    expect(screen.getByText(/não possui permissão para acessar esta área/i)).toBeTruthy();
  });

  // O desenho so recusa. Dizer o papel corrente e o que permite ao operador saber se pediu a
  // area errada ou se falta permissao na conta dele.
  it('declara o papel corrente', async () => {
    await montar(usuario('CLIENTE'));

    const chip = document.querySelector('.px42-papel');
    expect(chip?.textContent).toContain('Você está autenticado como');
    expect(chip?.querySelector('strong')?.textContent).toBe('CLIENTE');
  });

  it('sem sessao carregada, omite o papel em vez de inventar um', async () => {
    await montar(null);

    expect(document.querySelector('.px42-papel')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Acesso negado' })).toBeTruthy();
  });

  it('oferece a volta para o dashboard', async () => {
    await montar(usuario('BACKOFFICE'));

    const voltar = screen.getByRole('link', { name: /Voltar ao dashboard/ });
    expect(voltar.getAttribute('href')).toBe('/app/dashboard');
  });

  it('o contato com o administrador leva ao perfil', async () => {
    await montar(usuario('BACKOFFICE'));

    const contato = screen.getByRole('link', { name: 'administrador' });
    expect(contato.getAttribute('href')).toBe('/app/profile');
  });
});
