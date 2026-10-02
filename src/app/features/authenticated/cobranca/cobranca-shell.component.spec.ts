import { importProvidersFrom } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthService } from '../../../core/auth/auth.service';
import { UsuarioRole } from '../../../core/api/api.models';
import { CobrancaShellComponent } from './cobranca-shell.component';
import { LucideAngularModule } from 'lucide-angular';
import { LUCIDE_ICONS } from '../../../core/icons/lucide-icons';

const ACCESS_TOKEN_KEY = 'SEP_ACCESS_TOKEN';

interface AuthStateProbe {
  currentUserState: { set: (u: unknown) => void };
}

async function renderComRole(role: UsuarioRole) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, 'mock-jwt-token');
  const result = await render(CobrancaShellComponent, {
    providers: [
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      provideRouter([]),
      provideHttpClient(),
    ],
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
  return result;
}

// A carteira de renegociacoes chega por HTTP (MSW); sem estabilizar, o painel ainda esta zerado.
async function estabilizar(fixture: {
  whenStable: () => Promise<unknown>;
  detectChanges: () => void;
}): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
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

  it('BACKOFFICE: visualiza o dashboard operacional de cobranca', async () => {
    await renderComRole('BACKOFFICE');

    expect(screen.getByText('Agenda financeira')).toBeTruthy();
    expect(screen.queryByText('Ver meus contratos')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Cobrança', level: 1 })).toBeTruthy();
  });

  it('painel de renegociacoes conta a carteira devolvida pela API', async () => {
    const { fixture } = await renderComRole('BACKOFFICE');
    await estabilizar(fixture);

    // O mock semeia tres renegociacoes: duas em proposta e uma aceita. O total do nucleo e a
    // legenda saem da mesma lista, e os status sem ocorrencia aparecem zerados.
    const painel = document.querySelector('.renegotiations') as HTMLElement;
    expect(painel.querySelector('.small-donut strong')?.textContent).toBe('3');
    const linhas = [...painel.querySelectorAll('li')].map((li) =>
      (li.textContent ?? '').replace(/\s+/g, ' ').trim(),
    );
    expect(linhas).toEqual(['Em proposta 2', 'Aceitas 1', 'Recusadas 0', 'Expiradas 0']);
  });

  it('oculta e restaura individualmente o valor de uma parcela', async () => {
    await renderComRole('BACKOFFICE');

    const hideButton = screen.getAllByRole('button', { name: 'Ocultar valor da parcela' })[0];
    fireEvent.click(hideButton);
    expect(screen.getByLabelText('Valor da parcela oculto')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Mostrar valor da parcela' })[0]).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: 'Mostrar valor da parcela' })[0]);
    expect(screen.queryByLabelText('Valor da parcela oculto')).toBeNull();
  });

  it('combina status e periodo ao filtrar parcelas', async () => {
    await renderComRole('BACKOFFICE');

    // Contrato 5b771c05: 10 parcelas mensais, as duas ultimas ainda agendadas.
    fireEvent.change(screen.getByLabelText('Status da parcela'), {
      target: { value: 'AGENDADA' },
    });
    fireEvent.change(screen.getByLabelText('Vencimento inicial'), {
      target: { value: '2026-06-01' },
    });

    expect(screen.getByText('10/10')).toBeTruthy();
    expect(screen.queryByText('9/10')).toBeNull();
  });

  it('mantem contrato selecionado compativel com o filtro de contratos', async () => {
    await renderComRole('BACKOFFICE');

    fireEvent.change(screen.getByLabelText('Status do contrato'), {
      target: { value: 'EM_DIA' },
    });

    expect(screen.getByRole('heading', { name: 'Contratos ativos (2)' })).toBeTruthy();
    expect(screen.getByText(/Parcelas do contrato 5b771c03/)).toBeTruthy();
    expect(screen.getByText('1/10')).toBeTruthy();
  });
});
