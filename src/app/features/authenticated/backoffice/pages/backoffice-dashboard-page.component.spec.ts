import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { AuthService } from '../../../../core/auth/auth.service';
import { BackofficeDashboardPageComponent } from './backoffice-dashboard-page.component';

async function renderPagina() {
  const result = await render(BackofficeDashboardPageComponent, {
    providers: [provideHttpClient(), provideRouter([])],
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
    expect(screen.getByText('Próximas jornadas')).toBeTruthy();
    expect(screen.getByText('Resumo operacional')).toBeTruthy();
    expect(screen.getByText('Atividades recentes')).toBeTruthy();
    expect(screen.getByText('Indicadores de performance')).toBeTruthy();
    expect(screen.getByText('Saúde da plataforma')).toBeTruthy();
  });

  it('usa os assets públicos do mockup 03 e preserva links principais', async () => {
    await renderPagina();

    const logo = screen.getAllByRole('img', { name: 'SEP' })[0] as HTMLImageElement;
    const filaLink = screen.getByRole('link', { name: /Backoffice/ });

    expect(logo.src).toContain('/image/sep_mockup_03_assets/logos/logo_sep_header_completo.png');
    expect(document.body.innerHTML).toContain('/image/sep_mockup_03_assets/icons/');
    expect(filaLink.getAttribute('href')).toBe('/app/backoffice/fila');
  });
});
