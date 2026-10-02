import { importProvidersFrom } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { AuthService } from '../../../../core/auth/auth.service';
import { BackofficeService } from '../../../../core/backoffice/backoffice.service';
import {
  buildOperationalDashboardSnapshot,
  createOperationalDashboardStore,
} from '../../../../../mocks/data/operational-dashboard.store';
import { BackofficeDashboardPageComponent } from './backoffice-dashboard-page.component';
import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';

async function renderPagina() {
  const result = await render(BackofficeDashboardPageComponent, {
    providers: [
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      provideHttpClient(),
      provideRouter([]),
      {
        provide: BackofficeService,
        useValue: {
          consultarDashboardOperacional: () =>
            of(buildOperationalDashboardSnapshot(createOperationalDashboardStore())),
        },
      },
    ],
  });
  const auth = result.fixture.debugElement.injector.get(AuthService) as AuthService & {
    currentUserState: { set: (u: unknown) => void };
  };
  auth.currentUserState.set({
    id: 'usuario-backoffice',
    username: 'backoffice@empresa.com',
    role: 'BACKOFFICE',
    dataCriacao: '2026-07-08T00:00:00Z',
    dataModificacao: '2026-07-08T00:00:00Z',
    criadoPor: 'sistema',
    modificadoPor: 'sistema',
    precisaRedefinirSenha: false,
    mfaHabilitado: false,
  });
  result.fixture.detectChanges();
  return result;
}

describe('BackofficeDashboardPageComponent', () => {
  it('renderiza o painel operacional autenticado com usuário backoffice', async () => {
    await renderPagina();

    expect(screen.getByRole('heading', { name: 'backoffice@empresa.com' })).toBeTruthy();
    expect(screen.getAllByText('backoffice@empresa.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText('BACKOFFICE').length).toBeGreaterThan(0);
    expect(screen.getByText('Personalizar dashboard')).toBeTruthy();
  });

  it('exibe métricas, jornadas e blocos operacionais do mockup 03', async () => {
    await renderPagina();

    expect(screen.getAllByText('Onboarding').length).toBeGreaterThan(0);
    expect(screen.getByText('Volume operacional')).toBeTruthy();
    expect(screen.getAllByText('Em andamento').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Em análise').length).toBeGreaterThan(0);
    expect(screen.getByText('Aguardando assinatura')).toBeTruthy();
    expect(screen.getByText('Operacional')).toBeTruthy();
    expect(screen.getByText('cadastros')).toBeTruthy();
    expect(screen.getByText('propostas')).toBeTruthy();
    expect(screen.getByText('contratos')).toBeTruthy();
    expect(screen.getByText('parcelas')).toBeTruthy();
    expect(screen.getByText('transações')).toBeTruthy();
    expect(screen.getByText('Próximas jornadas')).toBeTruthy();
    expect(screen.getByText('Resumo operacional')).toBeTruthy();
    expect(screen.getByText('Atividades recentes')).toBeTruthy();
    expect(screen.getByText('Indicadores de performance')).toBeTruthy();
    expect(screen.getByText('Saúde da plataforma')).toBeTruthy();
  });

  it('usa a moldura do shell homologado, e nao uma copia propria', async () => {
    await renderPagina();

    // A pagina tinha menu e cabecalho proprios, com pesquisa, alertas e ajuda sem acao. Agora a
    // moldura e a do shell: um unico menu lateral, e os botoes do cabecalho abrem painel.
    expect(document.querySelectorAll('.op-sidebar')).toHaveLength(1);
    expect(document.querySelector('sep-operational-shell .op-welcome')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pesquisar telas' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ajuda' })).toBeTruthy();
  });

  it('leva "Ver todas" das atividades para a fila operacional', async () => {
    await renderPagina();

    expect(screen.getByRole('link', { name: 'Ver todas' }).getAttribute('href')).toBe(
      '/app/backoffice/fila',
    );
  });

  it('desenha os simbolos em vetor e mantém os wrappers de escala por categoria', async () => {
    await renderPagina();

    expect(document.querySelectorAll('.op-metric-icon lucide-icon')).toHaveLength(6);
    expect(document.querySelectorAll('.op-journey-icon lucide-icon')).toHaveLength(4);
    expect(document.querySelectorAll('.op-performance-ring')).toHaveLength(4);

    const journeyProgress = Array.from(
      document.querySelectorAll<HTMLElement>('.op-journey .op-progress span'),
    ).map((progress) => progress.style.width);
    expect(journeyProgress).toEqual(['100%', '100%', '63%', '56%']);
  });

  it('apresenta erro recuperavel quando o snapshot operacional falha', async () => {
    await render(BackofficeDashboardPageComponent, {
      providers: [
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
        provideHttpClient(),
        provideRouter([]),
        {
          provide: BackofficeService,
          useValue: {
            consultarDashboardOperacional: () => throwError(() => new Error('indisponivel')),
          },
        },
      ],
    });

    expect(
      screen.getByText('Não foi possível atualizar os indicadores operacionais. Tente novamente.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy();
  });
});
