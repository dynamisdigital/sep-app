import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { LUCIDE_ICONS } from '../../../core/icons/lucide-icons';
import { AuthService } from '../../../core/auth/auth.service';
import { DashboardComponent } from './dashboard.component';

const ACCESS_TOKEN_KEY = 'SEP_ACCESS_TOKEN';

async function logarAdmin(result: {
  fixture: { debugElement: { injector: { get: <T>(t: unknown) => T } } };
}) {
  const auth = result.fixture.debugElement.injector.get<AuthService>(AuthService);
  await new Promise<void>((resolve, reject) => {
    auth.login({ username: 'admin@empresa.com', password: '123456' }).subscribe({
      next: () => resolve(),
      error: reject,
    });
  });
}

describe('DashboardComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('sem usuario: mostra titulo Dashboard generico', async () => {
    await render(DashboardComponent, {
      providers: [
        provideRouter([]),
        provideHttpClient(),
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      ],
    });

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeTruthy();
  });

  it('ADMIN: mostra saudacao, role e atalho de Administracao', async () => {
    const result = await render(DashboardComponent, {
      providers: [
        provideRouter([]),
        provideHttpClient(),
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      ],
    });
    await logarAdmin(result);
    result.fixture.detectChanges();

    expect(screen.getByText(/ola, admin@empresa.com/i)).toBeTruthy();
    expect(screen.getByText('ADMIN')).toBeTruthy();
    expect(screen.getByText('Administracao de usuarios')).toBeTruthy();
    expect(screen.getByText('Meu perfil')).toBeTruthy();
    expect(screen.getByText('Alterar senha')).toBeTruthy();
  });

  it('CLIENTE: ve atalhos de perfil e senha mas nao ve Administracao', async () => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, 'mock-jwt-token');
    const result = await render(DashboardComponent, {
      providers: [
        provideRouter([]),
        provideHttpClient(),
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      ],
    });
    const auth = result.fixture.debugElement.injector.get(AuthService) as unknown as {
      currentUserState: { set: (u: unknown) => void };
    };
    auth.currentUserState.set({
      id: 'cli-1',
      username: 'cliente@empresa.com',
      role: 'CLIENTE',
      dataCriacao: '2026-04-24T18:30:00-03:00',
      dataModificacao: '2026-04-24T18:30:00-03:00',
      criadoPor: 'system',
      modificadoPor: 'system',
    });
    result.fixture.detectChanges();

    expect(screen.getByText('Meu perfil')).toBeTruthy();
    expect(screen.getByText('Alterar senha')).toBeTruthy();
    expect(screen.queryByText('Administracao de usuarios')).toBeNull();
  });

  it('cards placeholder existem como articles sem href', async () => {
    await render(DashboardComponent, {
      providers: [
        provideRouter([]),
        provideHttpClient(),
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      ],
    });

    expect(screen.getByText('Onboarding')).toBeTruthy();
    expect(screen.getByText('Analise de credito')).toBeTruthy();
    expect(screen.getByText('Formalizacao')).toBeTruthy();
    expect(screen.getByText('Cobranca')).toBeTruthy();
    const onboarding = screen.getByText('Onboarding').closest('article');
    expect(onboarding?.getAttribute('aria-disabled')).toBe('true');
  });

  it('atalho Meu perfil aponta para /app/profile', async () => {
    const result = await render(DashboardComponent, {
      providers: [
        provideRouter([]),
        provideHttpClient(),
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      ],
    });
    await logarAdmin(result);
    result.fixture.detectChanges();

    const link = screen.getByText('Meu perfil').closest('a');
    expect(link?.getAttribute('href')).toBe('/app/profile');
  });
});
