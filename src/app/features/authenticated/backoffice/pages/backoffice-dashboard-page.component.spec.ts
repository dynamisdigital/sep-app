import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '../../../../../mocks/server';
import { BackofficeDashboardPageComponent } from './backoffice-dashboard-page.component';

const DASHBOARD_URL = 'http://localhost:8080/api/v1/backoffice/dashboard';

async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

async function estabilizar(fixture: ComponentFixture<unknown>): Promise<void> {
  await fixture.whenStable();
  await flush();
  fixture.detectChanges();
}

function renderPagina() {
  return render(BackofficeDashboardPageComponent, {
    providers: [provideHttpClient(), provideRouter([])],
  });
}

describe('BackofficeDashboardPageComponent', () => {
  it('apresenta KPIs, contadores e valores monetarios do backend', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    expect(screen.getByText('Recebimentos do dia')).toBeTruthy();
    expect(screen.getByText('Inadimplencia total')).toBeTruthy();
    expect(screen.getByText(/18\.450,75/)).toBeTruthy();
    expect(screen.getByText('Em tratamento')).toBeTruthy();
    // O mesmo tipo pode aparecer em "por tipo" e em "top 5"; basta render em pelo menos um painel.
    expect(screen.getAllByText('Cobranca inadimplente').length).toBeGreaterThan(0);
  });

  it('formata o tempo medio de resolucao a partir dos segundos do backend', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    // 7200s -> 2h
    expect(screen.getByText('2h')).toBeTruthy();
  });

  it('mostra estado de erro com retry quando o backend falha', async () => {
    server.use(
      http.get(DASHBOARD_URL, () =>
        HttpResponse.json({ message: 'Erro no servidor' }, { status: 500 }),
      ),
    );
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    expect(screen.getByText('Erro no servidor')).toBeTruthy();
    expect(screen.getByText('Tentar novamente')).toBeTruthy();
  });
});
