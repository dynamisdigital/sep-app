import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { provideRouter } from '@angular/router';

import { AccessDeniedComponent } from './access-denied.component';

describe('AccessDeniedComponent', () => {
  it('mostra titulo, badge 403 e link para dashboard', async () => {
    await render(AccessDeniedComponent, {
      providers: [provideRouter([])],
    });

    expect(screen.getByRole('heading', { name: 'Acesso negado' })).toBeTruthy();
    expect(screen.getByText('403')).toBeTruthy();
    expect(screen.getByRole('link', { name: /voltar ao dashboard/i })).toBeTruthy();
  });

  it('expoe a regiao principal nomeada pelo heading', async () => {
    await render(AccessDeniedComponent, { providers: [provideRouter([])] });

    const main = screen.getByRole('main');
    expect(main).toBeTruthy();
    // A regiao nomeada e o que faz o leitor de tela anunciar "Acesso negado" ao entrar nela,
    // em vez de "regiao" sem nome.
    expect(screen.getByRole('region', { name: 'Acesso negado' })).toBeTruthy();
  });

  // Destino de redirect automatico do errorInterceptor (403) e do roleGuard. Sem mover o foco ele
  // fica na tela anterior, ja substituida, e o usuario de leitor de tela nao percebe a negacao.
  it('move o foco para o heading ao abrir', async () => {
    await render(AccessDeniedComponent, { providers: [provideRouter([])] });

    const heading = screen.getByRole('heading', { name: 'Acesso negado' });
    expect(document.activeElement).toBe(heading);
    // Sem tabindex="-1" o <h1> nao e focavel e o focus() acima seria silenciosamente ignorado.
    expect(heading.getAttribute('tabindex')).toBe('-1');
  });
});
