import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { provideRouter } from '@angular/router';

import { AccountLockedComponent } from './account-locked.component';

async function renderPagina() {
  // O componente so importa RouterLink; provideRouter([]) basta para o link resolver.
  return render(AccountLockedComponent, { providers: [provideRouter([])] });
}

describe('AccountLockedComponent', () => {
  it('anuncia o bloqueio no heading', async () => {
    await renderPagina();

    expect(
      screen.getByRole('heading', { level: 1, name: /conta bloqueada temporariamente/i }),
    ).toBeTruthy();
  });

  it('informa o prazo real de 30 minutos', async () => {
    await renderPagina();

    // 30 = app.security.lockout.lockout-minutes no sep-api. A copy anterior dizia "alguns
    // minutos", que nao permitia ao usuario decidir se esperava ou procurava ajuda.
    expect(screen.getByText(/30 minutos/i)).toBeTruthy();
  });

  it('informa que o desbloqueio e automatico', async () => {
    await renderPagina();

    expect(screen.getByText(/desbloqueio e automatico/i)).toBeTruthy();
  });

  it('nao promete acao manual de liberacao, que nao existe no sep-api', async () => {
    await renderPagina();

    // Nao ha endpoint de unlock nem acao administrativa: prometer suporte ou liberacao mandaria o
    // usuario abrir um chamado que ninguem consegue atender.
    expect(screen.queryByText(/alguns minutos/i)).toBeNull();
    expect(screen.queryByText(/entre em contato/i)).toBeNull();
    expect(screen.queryByText(/solicit/i)).toBeNull();
  });

  it('oferece o caminho de volta para /login', async () => {
    await renderPagina();

    const voltar = screen.getByRole('link', { name: /voltar ao login/i });

    expect(voltar.getAttribute('href')).toBe('/login');
  });
});
