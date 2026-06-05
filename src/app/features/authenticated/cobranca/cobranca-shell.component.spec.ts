import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthService } from '../../../core/auth/auth.service';
import { UsuarioRole } from '../../../core/api/api.models';
import { CobrancaShellComponent } from './cobranca-shell.component';

const ACCESS_TOKEN_KEY = 'SEP_ACCESS_TOKEN';

interface AuthStateProbe {
  currentUserState: { set: (u: unknown) => void };
}

async function renderComRole(role: UsuarioRole) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, 'mock-jwt-token');
  const result = await render(CobrancaShellComponent, {
    providers: [provideRouter([]), provideHttpClient()],
  });
  const auth = result.fixture.debugElement.injector.get(AuthService) as unknown as AuthStateProbe;
  auth.currentUserState.set({
    id: 'u-1',
    username: 'u@empresa.com',
    role,
    dataCriacao: '2026-04-24T18:30:00-03:00',
    dataModificacao: '2026-04-24T18:30:00-03:00',
    criadoPor: 'system',
    modificadoPor: 'system',
  });
  result.fixture.detectChanges();
}

describe('CobrancaShellComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('tomador CLIENTE: mostra entrada por contrato e oculta telas financeiras', async () => {
    await renderComRole('CLIENTE');

    expect(screen.getByText('Ver meus contratos')).toBeTruthy();
    expect(screen.queryByText('Agenda financeira')).toBeNull();
  });

  it('FINANCEIRO: navega para agenda/inadimplencia e oculta entrada do tomador', async () => {
    await renderComRole('FINANCEIRO');

    const agendaLink = screen.getByText('Agenda financeira').closest('a');
    expect(agendaLink?.getAttribute('href')).toBe('/app/cobranca/financeiro/agenda');
    const inadimplenciaLink = screen.getByText('Inadimplencia').closest('a');
    expect(inadimplenciaLink?.getAttribute('href')).toBe('/app/cobranca/financeiro/inadimplencia');
    expect(screen.queryByText('Ver meus contratos')).toBeNull();
  });

  it('ADMIN: tambem navega para as telas financeiras', async () => {
    await renderComRole('ADMIN');

    expect(screen.getByText('Agenda financeira').closest('a')?.getAttribute('href')).toBe(
      '/app/cobranca/financeiro/agenda',
    );
  });

  it('BACKOFFICE: sem jornada de cobranca (nem financeiro nem tomador)', async () => {
    await renderComRole('BACKOFFICE');

    expect(screen.queryByText('Agenda financeira')).toBeNull();
    expect(screen.queryByText('Ver meus contratos')).toBeNull();
    expect(screen.getByText('Seu perfil nao tem jornada de cobranca.')).toBeTruthy();
  });
});
