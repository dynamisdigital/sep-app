import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { beforeEach, describe, expect, it } from 'vitest';

import { LUCIDE_ICONS } from '../../core/icons/lucide-icons';
import { AuthService } from '../../core/auth/auth.service';
import { SidenavComponent } from './sidenav.component';

const ACCESS_TOKEN_KEY = 'SEP_ACCESS_TOKEN';

describe('SidenavComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('sem usuario: mostra dashboard mas oculta administracao', async () => {
    await render(SidenavComponent, {
      providers: [
        provideRouter([]),
        provideHttpClient(),
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      ],
    });

    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.queryByText('Administracao')).toBeNull();
  });

  it('ADMIN: mostra Dashboard, Meu perfil e Administracao', async () => {
    const result = await render(SidenavComponent, {
      providers: [
        provideRouter([]),
        provideHttpClient(),
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      ],
    });
    const auth = result.fixture.debugElement.injector.get(AuthService);
    await new Promise<void>((resolve, reject) => {
      auth.login({ username: 'admin@empresa.com', password: '123456' }).subscribe({
        next: () => resolve(),
        error: reject,
      });
    });
    result.fixture.detectChanges();

    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.getByText('Meu perfil')).toBeTruthy();
    expect(screen.getByText('Administracao')).toBeTruthy();
  });

  it('CLIENTE: ve Dashboard e Meu perfil mas oculta Administracao', async () => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, 'mock-jwt-token');
    const result = await render(SidenavComponent, {
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

    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.getByText('Onboarding')).toBeTruthy();
    expect(screen.getByText('Meu perfil')).toBeTruthy();
    expect(screen.queryByText('Administracao')).toBeNull();
  });

  it('Onboarding aponta para /app/onboarding', async () => {
    const result = await render(SidenavComponent, {
      providers: [
        provideRouter([]),
        provideHttpClient(),
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      ],
    });
    const auth = result.fixture.debugElement.injector.get(AuthService);
    await new Promise<void>((resolve, reject) => {
      auth.login({ username: 'admin@empresa.com', password: '123456' }).subscribe({
        next: () => resolve(),
        error: reject,
      });
    });
    result.fixture.detectChanges();

    const onboardingLink = screen.getByText('Onboarding').closest('a');
    expect(onboardingLink?.getAttribute('href')).toBe('/app/onboarding');
  });

  it('Credito aparece para autenticado e aponta para /app/credito', async () => {
    const result = await render(SidenavComponent, {
      providers: [
        provideRouter([]),
        provideHttpClient(),
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      ],
    });
    const auth = result.fixture.debugElement.injector.get(AuthService);
    await new Promise<void>((resolve, reject) => {
      auth.login({ username: 'admin@empresa.com', password: '123456' }).subscribe({
        next: () => resolve(),
        error: reject,
      });
    });
    result.fixture.detectChanges();

    const creditoLink = screen.getByText('Credito').closest('a');
    expect(creditoLink?.getAttribute('href')).toBe('/app/credito');
  });

  it('Formalizacao aparece para autenticado e aponta para /app/formalizacao', async () => {
    const result = await render(SidenavComponent, {
      providers: [
        provideRouter([]),
        provideHttpClient(),
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      ],
    });
    const auth = result.fixture.debugElement.injector.get(AuthService);
    await new Promise<void>((resolve, reject) => {
      auth.login({ username: 'admin@empresa.com', password: '123456' }).subscribe({
        next: () => resolve(),
        error: reject,
      });
    });
    result.fixture.detectChanges();

    const link = screen.getByText('Formalizacao').closest('a');
    expect(link?.getAttribute('href')).toBe('/app/formalizacao');
  });

  it('Cobranca aparece para autenticado e aponta para /app/cobranca', async () => {
    const result = await render(SidenavComponent, {
      providers: [
        provideRouter([]),
        provideHttpClient(),
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      ],
    });
    const auth = result.fixture.debugElement.injector.get(AuthService);
    await new Promise<void>((resolve, reject) => {
      auth.login({ username: 'admin@empresa.com', password: '123456' }).subscribe({
        next: () => resolve(),
        error: reject,
      });
    });
    result.fixture.detectChanges();

    const link = screen.getByText('Cobranca').closest('a');
    expect(link?.getAttribute('href')).toBe('/app/cobranca');
  });

  it('BACKOFFICE: ve Backoffice (->/app/backoffice) mas oculta Administracao', async () => {
    const result = await render(SidenavComponent, {
      providers: [
        provideRouter([]),
        provideHttpClient(),
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      ],
    });
    const auth = result.fixture.debugElement.injector.get(AuthService);
    await new Promise<void>((resolve, reject) => {
      auth.login({ username: 'backoffice@empresa.com', password: '123456' }).subscribe({
        next: () => resolve(),
        error: reject,
      });
    });
    result.fixture.detectChanges();

    expect(screen.getByText('Backoffice').closest('a')?.getAttribute('href')).toBe(
      '/app/backoffice',
    );
    expect(screen.getByText('Pix').closest('a')?.getAttribute('href')).toBe('/app/pix');
    expect(screen.queryByText('Administracao')).toBeNull();
  });

  it('Pix aparece para FINANCEIRO e aponta para /app/pix', async () => {
    const result = await render(SidenavComponent, {
      providers: [
        provideRouter([]),
        provideHttpClient(),
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      ],
    });
    const auth = result.fixture.debugElement.injector.get(AuthService);
    await new Promise<void>((resolve, reject) => {
      auth.login({ username: 'financeiro@empresa.com', password: '123456' }).subscribe({
        next: () => resolve(),
        error: reject,
      });
    });
    result.fixture.detectChanges();

    expect(screen.getByText('Pix').closest('a')?.getAttribute('href')).toBe('/app/pix');
  });

  it('CLIENTE: nao ve o menu Pix', async () => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, 'mock-jwt-token');
    const result = await render(SidenavComponent, {
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

    expect(screen.queryByText('Pix')).toBeNull();
  });

  it('CLIENTE: nao ve o menu Backoffice', async () => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, 'mock-jwt-token');
    const result = await render(SidenavComponent, {
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

    expect(screen.queryByText('Backoffice')).toBeNull();
  });

  it('link Meu perfil aponta para /app/profile e Administracao para /app/admin', async () => {
    const result = await render(SidenavComponent, {
      providers: [
        provideRouter([]),
        provideHttpClient(),
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      ],
    });
    const auth = result.fixture.debugElement.injector.get(AuthService);
    await new Promise<void>((resolve, reject) => {
      auth.login({ username: 'admin@empresa.com', password: '123456' }).subscribe({
        next: () => resolve(),
        error: reject,
      });
    });
    result.fixture.detectChanges();

    const perfilLink = screen.getByText('Meu perfil').closest('a');
    const adminLink = screen.getByText('Administracao').closest('a');
    expect(perfilLink?.getAttribute('href')).toBe('/app/profile');
    expect(adminLink?.getAttribute('href')).toBe('/app/admin');
  });
});
