import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LucideAngularModule } from 'lucide-angular';

import { AuthService } from '../../../../core/auth/auth.service';
import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';
import { StepUpTokenStore } from '../../../../core/auth/step-up-token.store';
import { stepUpInterceptor } from '../../../../core/interceptors/step-up.interceptor';
import { resetGovernancaState } from '../../../../../mocks/handlers';
import { UserDetailComponent } from './user-detail.component';

const ADMIN_ID = '1f0799c0-98b9-6d9d-bc4a-7d6f5b771001';
const CLIENTE_ID = '1f0799c0-98b9-6d9d-bc4a-7d6f5b771002';
const MULTIROLE_ID = '1f0799c0-98b9-6d9d-bc4a-7d6f5b771005';

async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

function activatedRouteMock(id: string) {
  return {
    snapshot: {
      paramMap: {
        get: (key: string) => (key === 'id' ? id : null),
      },
      queryParamMap: { get: () => null },
    },
  };
}

interface AuthProbe {
  currentUserState: { set: (u: unknown) => void };
}

function usuarioMock(id: string, mfaHabilitado: boolean) {
  return {
    id,
    username: 'operador@empresa.com',
    role: 'ADMIN',
    precisaRedefinirSenha: false,
    mfaHabilitado,
    dataCriacao: '2026-04-24T18:30:00-03:00',
    dataModificacao: '2026-04-24T18:30:00-03:00',
    criadoPor: 'system',
    modificadoPor: 'system',
  };
}

async function setup(id: string) {
  const result = await render(UserDetailComponent, {
    providers: [
      provideRouter([]),
      provideHttpClient(),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      { provide: ActivatedRoute, useValue: activatedRouteMock(id) },
    ],
  });
  await result.fixture.whenStable();
  await flush();
  result.fixture.detectChanges();
  return result;
}

async function setupRoles(
  id: string,
  opts: { token?: string; operadorId?: string; mfaHabilitado?: boolean } = {},
) {
  const result = await render(UserDetailComponent, {
    providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([stepUpInterceptor])),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      { provide: ActivatedRoute, useValue: activatedRouteMock(id) },
    ],
  });
  if (opts.operadorId) {
    const auth = result.fixture.debugElement.injector.get(AuthService) as unknown as AuthProbe;
    auth.currentUserState.set(usuarioMock(opts.operadorId, opts.mfaHabilitado ?? false));
  }
  if (opts.token) {
    result.fixture.debugElement.injector.get(StepUpTokenStore).set(opts.token);
  }
  await result.fixture.whenStable();
  await flush();
  result.fixture.detectChanges();
  return result;
}

function chip(role: string): HTMLButtonElement {
  return screen.getByRole('button', { name: new RegExp(`^${role}`) }) as HTMLButtonElement;
}

function chipAtivo(role: string): boolean {
  return chip(role).classList.contains('px39-chip-ativo');
}

describe('UserDetailComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    resetGovernancaState();
  });

  it('carrega usuario do id da rota e renderiza identificacao', async () => {
    await setup(CLIENTE_ID);

    expect(screen.getByText('cliente@empresa.com')).toBeTruthy();
    expect(screen.getByText('CLIENTE', { selector: '.px39-selo' })).toBeTruthy();
    expect(screen.getByText(CLIENTE_ID)).toBeTruthy();
  });

  it('renderiza auditoria do usuario', async () => {
    await setup(ADMIN_ID);

    expect(screen.getByText('Criado em')).toBeTruthy();
    expect(screen.getByText('Modificado em')).toBeTruthy();
    expect(screen.getByText('Criado por')).toBeTruthy();
    expect(screen.getByText('Modificado por')).toBeTruthy();
  });

  it('mostra erro quando id nao existe', async () => {
    await setup('id-inexistente');

    expect(screen.getByRole('alert').textContent).toMatch(/usuário não encontrado/i);
  });

  it('link voltar aponta para /app/admin/users', async () => {
    await setup(ADMIN_ID);

    const back = screen.getByText(/^voltar$/i).closest('a');
    expect(back?.getAttribute('href')).toBe('/app/admin/users');
  });

  describe('roles cumulativas', () => {
    it('exibe o conjunto de roles e a role principal do usuario-alvo', async () => {
      await setupRoles(MULTIROLE_ID);

      expect(chipAtivo('FINANCEIRO')).toBe(true);
      expect(chipAtivo('BACKOFFICE')).toBe(true);
      expect(chipAtivo('ADMIN')).toBe(false);
      // A role principal vem marcada pela legenda que o backend devolve.
      expect(chip('FINANCEIRO').textContent).toContain('principal');
    });

    it('exibe a nota de auditoria de roles (trilha detalhada nao exibida na web)', async () => {
      await setupRoles(MULTIROLE_ID);

      expect(screen.getByText(/Alterações de roles são auditadas no backend/)).toBeTruthy();
    });

    it('aplica o toggle e salva o conjunto via PUT com step-up, mostrando sucesso', async () => {
      const result = await setupRoles(MULTIROLE_ID, { token: 'step-up-tok', operadorId: ADMIN_ID });

      expect(chipAtivo('ADMIN')).toBe(false);

      fireEvent.click(chip('ADMIN'));
      result.fixture.detectChanges();
      expect(chipAtivo('ADMIN')).toBe(true);

      fireEvent.click(screen.getByText('Salvar roles'));
      await result.fixture.whenStable();
      await flush();
      result.fixture.detectChanges();

      expect(screen.getByText('Roles atualizadas.')).toBeTruthy();
      // O conjunto enviado inclui ADMIN: a principal retornada pelo backend passa a ser ADMIN.
      expect(chip('ADMIN').textContent).toContain('principal');
    });

    it('bloqueia auto-edicao do proprio admin', async () => {
      await setupRoles(ADMIN_ID, { operadorId: ADMIN_ID });

      expect(screen.getByText(/não pode alterar as próprias roles/i)).toBeTruthy();
      // Sem endpoint aplicável, o botão de salvar sequer é oferecido.
      expect(screen.queryByText('Salvar roles')).toBeNull();
      expect(chip('ADMIN').disabled).toBe(true);
    });

    // Sem isto o operador confirma a identidade no step-up e volta para uma tela que esqueceu o
    // que ele havia pedido.
    it('retoma a alteracao autorizada ao voltar do step-up', async () => {
      window.sessionStorage.setItem(
        'SEP_ROLES_PENDENTES',
        JSON.stringify({ usuarioId: MULTIROLE_ID, roles: ['FINANCEIRO', 'BACKOFFICE', 'ADMIN'] }),
      );

      const result = await setupRoles(MULTIROLE_ID, {
        token: 'step-up-tok',
        operadorId: ADMIN_ID,
      });
      await result.fixture.whenStable();
      await flush();
      result.fixture.detectChanges();

      expect(screen.getByText('Roles atualizadas.')).toBeTruthy();
      expect(chipAtivo('ADMIN')).toBe(true);
      expect(window.sessionStorage.getItem('SEP_ROLES_PENDENTES')).toBeNull();
    });

    it('403 sem step-up redireciona para /app/step-up e guarda a intencao', async () => {
      const result = await setupRoles(MULTIROLE_ID, { operadorId: ADMIN_ID, mfaHabilitado: true });
      const router = result.fixture.debugElement.injector.get(Router);
      const navSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

      fireEvent.click(screen.getByText('Salvar roles'));
      await result.fixture.whenStable();
      await flush();
      result.fixture.detectChanges();

      expect(navSpy).toHaveBeenCalledWith(`/app/step-up?next=/app/admin/users/${MULTIROLE_ID}`);
      expect(window.sessionStorage.getItem('SEP_ROLES_PENDENTES')).toContain(MULTIROLE_ID);
    });
  });
});
