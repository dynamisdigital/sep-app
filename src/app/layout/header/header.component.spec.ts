import { afterEach, describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/angular';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { delay, http, HttpResponse } from 'msw';

import { HeaderComponent } from './header.component';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';
import { LUCIDE_ICONS } from '../../core/icons/lucide-icons';
import { authInterceptor } from '../../core/interceptors/auth.interceptor';
import { resetLoginMockState, resetNotificacoesState } from '../../../mocks/handlers';
import { server } from '../../../mocks/server';
import { estabilizar, flush } from '../../../testing/estabilizar';

const API = 'http://localhost:8080/api/v1';

const ACCESS_TOKEN_KEY = 'SEP_ACCESS_TOKEN';

describe('HeaderComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('mostra brand SEP', async () => {
    await render(HeaderComponent, {
      providers: [
        provideRouter([]),
        provideHttpClient(),
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      ],
    });

    expect(screen.getByText('SEP')).toBeTruthy();
  });

  it('mostra usuario autenticado e badge de role', async () => {
    const result = await render(HeaderComponent, {
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

    expect(screen.getByText('admin@empresa.com')).toBeTruthy();
    expect(screen.getByText('ADMIN')).toBeTruthy();
  });

  it('logout limpa sessao e navega para /login', async () => {
    const result = await render(HeaderComponent, {
      providers: [
        provideRouter([]),
        provideHttpClient(),
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      ],
    });
    const auth = result.fixture.debugElement.injector.get(AuthService);
    const router = result.fixture.debugElement.injector.get(Router);
    let navigatedTo: string | null = null;
    router.navigateByUrl = (url: string) => {
      navigatedTo = url;
      return Promise.resolve(true);
    };

    await new Promise<void>((resolve, reject) => {
      auth.login({ username: 'admin@empresa.com', password: '123456' }).subscribe({
        next: () => resolve(),
        error: reject,
      });
    });
    result.fixture.detectChanges();

    // 5F-FIX-02: logout agora sempre faz POST /auth/logout (MSW responde 204);
    // o efeito de clearSession + navigate fica em microtask posterior.
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
    await result.fixture.whenStable();

    expect(window.localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(auth.currentUser()).toBeNull();
    expect(navigatedTo).toBe('/login');
  });

  it('toggle de tema alterna entre claro e escuro', async () => {
    const result = await render(HeaderComponent, {
      providers: [
        provideRouter([]),
        provideHttpClient(),
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      ],
    });
    const theme = result.fixture.debugElement.injector.get(ThemeService);
    const before = theme.isDark();

    fireEvent.click(screen.getByRole('button', { name: /tema/i }));
    result.fixture.detectChanges();

    expect(theme.isDark()).toBe(!before);
  });

  it('botao de menu emite toggleSidenav', async () => {
    const result = await render(HeaderComponent, {
      providers: [
        provideRouter([]),
        provideHttpClient(),
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      ],
    });
    let emitted = false;
    result.fixture.componentInstance.toggleSidenav.subscribe(() => {
      emitted = true;
    });

    fireEvent.click(screen.getByRole('button', { name: 'Alternar menu lateral' }));

    expect(emitted).toBe(true);
  });
});

// Contador de nao lidas (F-Sprint 27, Task 127.2). Exercita os handlers MSW reais da central:
// o numero vem do recorte dono + IN_APP do mock, nao de um stub do teste.
describe('HeaderComponent — contador de notificacoes', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetLoginMockState();
    resetNotificacoesState();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // `estabilizar` espera o `whenStable`, que inclui HTTP pendente: com a contagem presa, use `false`.
  async function renderLogado(username: string, esperarEstavel = true) {
    const result = await render(HeaderComponent, {
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      ],
    });
    const auth = result.fixture.debugElement.injector.get(AuthService);
    await new Promise<void>((resolve, reject) => {
      auth.login({ username, password: '123456' }).subscribe({
        next: () => resolve(),
        error: reject,
      });
    });
    if (esperarEstavel) {
      await estabilizar(result.fixture);
      await estabilizar(result.fixture);
    } else {
      result.fixture.detectChanges();
      await flush();
      result.fixture.detectChanges();
    }
    return result;
  }

  function linkDaCentral(): HTMLElement {
    return screen.getByRole('link', { name: /^Notificacoes/ });
  }

  it('sem sessao nao mostra o acesso a central', async () => {
    await render(HeaderComponent, {
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      ],
    });

    expect(screen.queryByRole('link', { name: /^Notificacoes/ })).toBeNull();
  });

  it('rotulo textual com a contagem do dono, sem contar aviso alheio nem e-mail', async () => {
    await renderLogado('tomador@empresa.com');

    const link = linkDaCentral();
    expect(link).toHaveAccessibleName('Notificacoes, 3 nao lidas');
    expect(link.getAttribute('href')).toBe('/app/notificacoes');
    expect(link.textContent?.trim()).toBe('3');
  });

  it('zero e dito por extenso e sem marcador numerico', async () => {
    await renderLogado('admin@empresa.com');

    const link = linkDaCentral();
    expect(link).toHaveAccessibleName('Notificacoes, nenhuma nao lida');
    expect(link.textContent?.trim()).toBe('');
  });

  it('uma nao lida usa o singular', async () => {
    server.use(
      http.get(`${API}/notificacoes/nao-lidas/contagem`, () => HttpResponse.json({ naoLidas: 1 })),
    );
    await renderLogado('admin@empresa.com');

    expect(linkDaCentral()).toHaveAccessibleName('Notificacoes, 1 nao lida');
  });

  it('acima de 99 o marcador satura, mas o rotulo diz o numero', async () => {
    server.use(
      http.get(`${API}/notificacoes/nao-lidas/contagem`, () =>
        HttpResponse.json({ naoLidas: 150 }),
      ),
    );
    await renderLogado('admin@empresa.com');

    const link = linkDaCentral();
    expect(link).toHaveAccessibleName('Notificacoes, 150 nao lidas');
    expect(link.textContent?.trim()).toBe('99+');
  });

  it('falha na contagem nao afirma zero e nao some com o acesso', async () => {
    server.use(
      http.get(
        `${API}/notificacoes/nao-lidas/contagem`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    await renderLogado('tomador@empresa.com');

    const link = linkDaCentral();
    expect(link).toHaveAccessibleName('Notificacoes, contagem de nao lidas indisponivel');
    expect(link.textContent?.trim()).toBe('?');
  });

  it('enquanto a contagem nao chega, o rotulo diz que esta carregando', async () => {
    server.use(
      http.get(`${API}/notificacoes/nao-lidas/contagem`, async () => {
        await delay('infinite');
        return HttpResponse.json({ naoLidas: 0 });
      }),
    );
    await renderLogado('tomador@empresa.com', false);

    expect(linkDaCentral()).toHaveAccessibleName('Notificacoes, carregando contagem de nao lidas');
  });

  it('explica quando a contagem atualiza, porque ela nao e tempo real', async () => {
    await renderLogado('tomador@empresa.com');

    expect(linkDaCentral().getAttribute('title')).toBe(
      'A contagem atualiza ao abrir a central e ao marcar um aviso como lido',
    );
  });

  it('nao consulta de novo com o tempo: sem polling', async () => {
    // Relogio falso ANTES do render, para alcancar qualquer timer que o header agende ao montar;
    // `shouldAdvanceTime` deixa o resto (MSW, whenStable) andar em tempo real.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let consultas = 0;
    server.events.on('request:start', ({ request }) => {
      if (request.url.endsWith('/notificacoes/nao-lidas/contagem')) {
        consultas += 1;
      }
    });
    const result = await renderLogado('tomador@empresa.com');
    expect(consultas).toBe(1);

    await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
    await estabilizar(result.fixture);

    expect(consultas).toBe(1);
    server.events.removeAllListeners();
  });
});
