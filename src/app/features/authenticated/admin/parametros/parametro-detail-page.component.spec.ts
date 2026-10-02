import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../../core/auth/auth.service';
import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';
import { StepUpTokenStore } from '../../../../core/auth/step-up-token.store';
import { stepUpInterceptor } from '../../../../core/interceptors/step-up.interceptor';
import { resetGovernancaState } from '../../../../../mocks/handlers';
import { ParametroDetailPageComponent } from './parametro-detail-page.component';

const ADMIN_ID = '1f0799c0-98b9-6d9d-bc4a-7d6f5b771001';
const CHAVE_COM_HISTORICO = 'credito.score.pre-aprovacao';
const CHAVE_DECIMAL = 'credito.valor.maximo.pf';

async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

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
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
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
    window.sessionStorage.clear();
    resetGovernancaState();
  });

  it('carrega detalhe e historico de versoes do parametro', async () => {
    await setup(CHAVE_COM_HISTORICO);

    expect(screen.getByText(CHAVE_COM_HISTORICO, { selector: 'h2' })).toBeTruthy();
    expect(screen.getAllByText('v3').length).toBeGreaterThan(0);
    expect(screen.getAllByText('v2').length).toBeGreaterThan(0);
    // A trilha mostra o par valor anterior/valor novo de cada versao.
    expect(screen.getAllByText('720').length).toBeGreaterThan(0);
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

    expect(screen.getByText('Parâmetro atualizado.')).toBeTruthy();
    expect(screen.getAllByText('v2').length).toBeGreaterThan(0);
    expect(screen.getByText('Reajuste do teto PF.')).toBeTruthy();
  });

  it('mostra erro quando a chave nao existe', async () => {
    await setup('chave.inexistente');

    // A tela mostra a mensagem que o backend devolveu, e nao um texto proprio.
    expect(screen.getByRole('alert').textContent).toMatch(/par.metro n.o encontrado/i);
  });

  // Sem justificativa a tela nem chega a chamar o backend: o campo e obrigatorio porque a
  // justificativa entra na trilha de auditoria.
  it('exige justificativa antes de enviar', async () => {
    const result = await setup(CHAVE_DECIMAL, { token: 'step-up-tok' });

    fireEvent.input(screen.getByLabelText(/Novo valor/), { target: { value: '60000.00' } });
    fireEvent.click(screen.getByText('Salvar valor'));
    await result.fixture.whenStable();
    await flush();
    result.fixture.detectChanges();

    expect(screen.getByText(/justificativa é obrigatória/i)).toBeTruthy();
    expect(screen.queryByText('Parâmetro atualizado.')).toBeNull();
  });

  // Sem isto o administrador confirma a identidade no step-up e volta para um formulario vazio.
  it('retoma a alteracao autorizada ao voltar do step-up', async () => {
    window.sessionStorage.setItem(
      'SEP_PARAMETRO_PENDENTE',
      JSON.stringify({
        chave: CHAVE_DECIMAL,
        novoValor: '75000.00',
        justificativa: 'Autorizado no step-up.',
      }),
    );

    const result = await setup(CHAVE_DECIMAL, { token: 'step-up-tok' });
    await result.fixture.whenStable();
    await flush();
    result.fixture.detectChanges();

    expect(screen.getByText('Parâmetro atualizado.')).toBeTruthy();
    expect(screen.getByText('Autorizado no step-up.')).toBeTruthy();
    expect(window.sessionStorage.getItem('SEP_PARAMETRO_PENDENTE')).toBeNull();
  });

  it('403 sem step-up redireciona para /app/step-up e guarda a intencao', async () => {
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
    expect(window.sessionStorage.getItem('SEP_PARAMETRO_PENDENTE')).toContain('60000.00');
  });
});
