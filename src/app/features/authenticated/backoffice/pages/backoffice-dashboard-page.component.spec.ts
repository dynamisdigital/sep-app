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

  /**
   * Este teste ja existia e ja assertava `'2h'` — mas passava pelo motivo errado: o mock devolvia
   * `7200` (numero), enquanto o backend real manda `"PT2H"`. O mock era mais correto que o servidor,
   * e por isso o `NaNmin` da tela nunca apareceu em teste nenhum. Com o mock alinhado, o mesmo assert
   * passa a exercitar o caminho de producao.
   */
  it('formata o tempo medio de resolucao a partir do Duration ISO-8601 do backend', async () => {
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    // "PT2H" -> 2h
    expect(screen.getByText('2h')).toBeTruthy();
  });

  /**
   * Trava o defeito pelo lado do sintoma, e nao so pelo do formato: o KPI nunca pode renderizar
   * `NaN`. Sem este assert, uma futura regressao no parse voltaria a exibir `NaNmin` e o teste acima
   * continuaria verde se o texto casasse por acaso em outro painel.
   */
  it('o KPI de tempo medio nunca renderiza NaN, seja qual for o formato recebido', async () => {
    // Payload literal, e nao um passthrough: um handler que faz `fetch` da propria URL e
    // reinterceptado pelo MSW e recursiona ate estourar a heap do worker.
    server.use(
      http.get(DASHBOARD_URL, () =>
        HttpResponse.json({
          contadoresPorTipo: [],
          contadoresPorPrioridade: [],
          contadoresPorStatus: [],
          // Formato antigo: numero de segundos, que e o que um backend anterior a Sprint 34
          // mandaria — e o que o proprio mock mandava ate esta Task.
          tempoMedioResolucao30d: 7200,
          itensCriticosAbertosMais48h: 0,
          topCincoTiposMaisFrequentes: [],
          recebimentosDoDia: 0,
          inadimplenciaTotal: { valorTotal: 0, numeroParcelas: 0 },
          propostasPorStatus: [],
          geradoEm: '2026-08-06T09:00:00-03:00',
        }),
      ),
    );
    const { fixture } = await renderPagina();
    await estabilizar(fixture);

    expect(screen.queryByText(/NaN/)).toBeNull();
    expect(screen.getByText('—')).toBeTruthy();
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
