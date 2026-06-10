import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../../core/auth/auth.service';
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

describe('UserDetailComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetGovernancaState();
  });

  it('carrega usuario do id da rota e renderiza identificacao', async () => {
    await setup(CLIENTE_ID);

    expect(screen.getByText('cliente@empresa.com')).toBeTruthy();
    expect(screen.getByText('CLIENTE', { selector: 'dd' })).toBeTruthy();
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

    expect(screen.getByRole('alert').textContent).toMatch(/usuario nao encontrado/i);
  });

  it('link voltar aponta para /app/admin/users', async () => {
    await setup(ADMIN_ID);

    const back = screen.getByText(/voltar para lista/i).closest('a');
    expect(back?.getAttribute('href')).toBe('/app/admin/users');
  });

  describe('roles cumulativas', () => {
    it('exibe o conjunto de roles e a role principal do usuario-alvo', async () => {
      await setupRoles(MULTIROLE_ID);

      expect(
        (screen.getByRole('checkbox', { name: 'FINANCEIRO' }) as HTMLInputElement).checked,
      ).toBe(true);
      expect(
        (screen.getByRole('checkbox', { name: 'BACKOFFICE' }) as HTMLInputElement).checked,
      ).toBe(true);
      expect((screen.getByRole('checkbox', { name: 'ADMIN' }) as HTMLInputElement).checked).toBe(
        false,
      );
      expect(screen.getByText('FINANCEIRO', { selector: 'strong' })).toBeTruthy();
    });

    it('exibe a nota de auditoria de roles (trilha detalhada nao exibida na web)', async () => {
      await setupRoles(MULTIROLE_ID);

      expect(screen.getByText(/Alteracoes de roles sao auditadas no backend/)).toBeTruthy();
    });

    it('aplica o toggle e salva o conjunto via PUT com step-up, mostrando sucesso', async () => {
      const result = await setupRoles(MULTIROLE_ID, { token: 'step-up-tok', operadorId: ADMIN_ID });

      const adminCheckbox = screen.getByRole('checkbox', { name: 'ADMIN' }) as HTMLInputElement;
      expect(adminCheckbox.checked).toBe(false);

      fireEvent.click(adminCheckbox);
      result.fixture.detectChanges();
      expect((screen.getByRole('checkbox', { name: 'ADMIN' }) as HTMLInputElement).checked).toBe(
        true,
      );

      fireEvent.click(screen.getByText('Salvar roles'));
      await result.fixture.whenStable();
      await flush();
      result.fixture.detectChanges();

      expect(screen.getByText('Roles atualizadas.')).toBeTruthy();
      // O conjunto enviado inclui ADMIN: a principal retornada pelo backend passa a ser ADMIN.
      expect(screen.getByText('ADMIN', { selector: 'strong' })).toBeTruthy();
    });

    it('bloqueia auto-edicao do proprio admin', async () => {
      await setupRoles(ADMIN_ID, { operadorId: ADMIN_ID });

      expect(screen.getByText('Voce nao pode alterar as proprias roles.')).toBeTruthy();
      expect((screen.getByText('Salvar roles') as HTMLButtonElement).disabled).toBe(true);
    });

    it('403 sem step-up redireciona para /app/step-up', async () => {
      const result = await setupRoles(MULTIROLE_ID, { operadorId: ADMIN_ID, mfaHabilitado: true });
      const router = result.fixture.debugElement.injector.get(Router);
      const navSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

      fireEvent.click(screen.getByText('Salvar roles'));
      await result.fixture.whenStable();
      await flush();
      result.fixture.detectChanges();

      expect(navSpy).toHaveBeenCalledWith(`/app/step-up?next=/app/admin/users/${MULTIROLE_ID}`);
    });
  });
});
