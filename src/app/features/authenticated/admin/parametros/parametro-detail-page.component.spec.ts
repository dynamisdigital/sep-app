import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../../core/auth/auth.service';
import { StepUpTokenStore } from '../../../../core/auth/step-up-token.store';
import { stepUpInterceptor } from '../../../../core/interceptors/step-up.interceptor';
import { resetGovernancaState } from '../../../../../mocks/handlers';
import { ParametroDetailPageComponent } from './parametro-detail-page.component';
import { flush } from '../../../../../testing/estabilizar';

const ADMIN_ID = '1f0799c0-98b9-6d9d-bc4a-7d6f5b771001';
const CHAVE_COM_HISTORICO = 'credito.score.pre-aprovacao';
const CHAVE_DECIMAL = 'credito.valor.maximo.pf';

function activatedRouteMock(chave: string) {
  return {
    snapshot: {
      paramMap: {
        get: (key: string) => (key === 'chave' ? chave : null),
      },
    },
  };
}

interface AuthProbe {
  currentUserState: { set: (u: unknown) => void };
}

function operadorAdmin(mfaHabilitado: boolean) {
  return {
    id: ADMIN_ID,
    username: 'admin@empresa.com',
    role: 'ADMIN',
    precisaRedefinirSenha: false,
    mfaHabilitado,
    dataCriacao: '2026-04-24T18:30:00-03:00',
    dataModificacao: '2026-04-24T18:30:00-03:00',
    criadoPor: 'system',
    modificadoPor: 'system',
  };
}

async function setup(chave: string, opts: { token?: string; mfaHabilitado?: boolean } = {}) {
  const result = await render(ParametroDetailPageComponent, {
    providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([stepUpInterceptor])),
      { provide: ActivatedRoute, useValue: activatedRouteMock(chave) },
    ],
  });
  const auth = result.fixture.debugElement.injector.get(AuthService) as unknown as AuthProbe;
  auth.currentUserState.set(operadorAdmin(opts.mfaHabilitado ?? false));
  if (opts.token) {
    result.fixture.debugElement.injector.get(StepUpTokenStore).set(opts.token);
  }
  await result.fixture.whenStable();
  await flush();
  result.fixture.detectChanges();
  return result;
}

describe('ParametroDetailPageComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetGovernancaState();
  });

  it('carrega detalhe e historico de versoes do parametro', async () => {
    await setup(CHAVE_COM_HISTORICO);

    expect(screen.getByText(CHAVE_COM_HISTORICO, { selector: 'h2' })).toBeTruthy();
    expect(screen.getByText(/Trilha auditavel/)).toBeTruthy();
    expect(screen.getByText('v3')).toBeTruthy();
    expect(screen.getByText('v2')).toBeTruthy();
    expect(screen.getByText('Retorno ao score padrao apos revisao de risco.')).toBeTruthy();
  });

  it('altera o valor com step-up e justificativa, mostrando nova versao no historico', async () => {
    const result = await setup(CHAVE_DECIMAL, { token: 'step-up-tok' });

    fireEvent.input(screen.getByLabelText(/Novo valor/), { target: { value: '60000.00' } });
    fireEvent.input(screen.getByLabelText('Justificativa'), {
      target: { value: 'Reajuste do teto PF.' },
    });
    fireEvent.click(screen.getByText('Salvar valor'));
    await result.fixture.whenStable();
    await flush();
    result.fixture.detectChanges();

    expect(screen.getByText('Parametro atualizado.')).toBeTruthy();
    expect(screen.getByText('v2')).toBeTruthy();
    expect(screen.getByText('Reajuste do teto PF.')).toBeTruthy();
  });

  it('mostra erro quando a chave nao existe', async () => {
    await setup('chave.inexistente');

    expect(screen.getByRole('alert').textContent).toMatch(/parametro nao encontrado/i);
  });

  it('403 sem step-up redireciona para /app/step-up', async () => {
    const result = await setup(CHAVE_DECIMAL, { mfaHabilitado: true });
    const router = result.fixture.debugElement.injector.get(Router);
    const navSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fireEvent.input(screen.getByLabelText(/Novo valor/), { target: { value: '60000.00' } });
    fireEvent.input(screen.getByLabelText('Justificativa'), {
      target: { value: 'Tentativa sem step-up.' },
    });
    fireEvent.click(screen.getByText('Salvar valor'));
    await result.fixture.whenStable();
    await flush();
    result.fixture.detectChanges();

    expect(navSpy).toHaveBeenCalledWith(`/app/step-up?next=/app/admin/parametros/${CHAVE_DECIMAL}`);
  });
});
