import { importProvidersFrom, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';
import { NotificacoesNaoLidasStore } from '../../../../core/notificacoes/notificacoes-nao-lidas.store';

import { server } from '../../../../../mocks/server';
import { CREDORA_ROUTES } from '../credora.routes';
import { MatchingSugestoesPageComponent } from './matching-sugestoes-page.component';
import { estabilizar } from '../../../../../testing/estabilizar';

const MATCHING_SUGERIDA_ID = '7f0799c0-98b9-6d9d-bc4a-7d6f5b78f001';
const SUGESTOES_URL = 'http://localhost:8080/api/v1/credores/matching/sugestoes';

// O shell operacional consulta a contagem de notificacoes ao montar; aqui ela e uma dublê.
const CENTRAL_NOTIFICACOES_FALSA = {
  provide: NotificacoesNaoLidasStore,
  useValue: { contagem: signal({ situacao: 'conhecida', naoLidas: 0 }), carregar: () => undefined },
};
const ICONES = importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS));

function renderPage() {
  return render(MatchingSugestoesPageComponent, {
    providers: [provideHttpClient(), provideRouter([]), ICONES, CENTRAL_NOTIFICACOES_FALSA],
  });
}

describe('MatchingSugestoesPageComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('rota /app/credora/matching e protegida por roleGuard para FINANCEIRO/ADMIN, sem presenceGuard', () => {
    const rota = CREDORA_ROUTES.find((r) => r.path === 'matching');

    expect(rota).toBeTruthy();
    expect(rota?.canActivate?.length).toBe(1);
    expect(rota?.data?.['roles']).toEqual(['FINANCEIRO', 'ADMIN']);
  });

  it('lista as sugestões do backend com IDs curtos, valor, critérios, status e data', async () => {
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    // Ordem deterministica do backend (maior valor elegivel primeiro); IDs aparecem como sufixo
    // curto, nunca o UUID integral como titulo.
    expect(screen.getByText('Operação 5b78c001 · Credora 5b780001')).toBeTruthy();
    expect(screen.getByText('Operação 5b78c002 · Credora 5b780001')).toBeTruthy();
    expect(screen.queryByText(/7f0799c0-98b9/)).toBeNull();
    expect(screen.getByText(/25\.000,00/)).toBeTruthy();
    expect(screen.getByText(/12\.000,00/)).toBeTruthy();
    expect(screen.getAllByText('CONTRATO_ASSINADO').length).toBe(2);
    expect(screen.getByText('CAPACIDADE_COMPORTA_VALOR')).toBeTruthy();
    expect(screen.getAllByText('Sugerida').length).toBe(2);
  });

  it('cada sugestão leva ao detalhe de decisão', async () => {
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    const links = screen.getAllByText('Ver detalhe e decidir');
    expect(links[0].getAttribute('href')).toBe(`/app/credora/matching/${MATCHING_SUGERIDA_ID}`);
  });

  it('faz UMA chamada na entrada e so consulta de novo por gesto explicito (sem polling)', async () => {
    let chamadas = 0;
    server.use(
      http.get(SUGESTOES_URL, () => {
        chamadas += 1;
        return HttpResponse.json([]);
      }),
    );
    const { fixture } = await renderPage();
    await estabilizar(fixture);
    await estabilizar(fixture);

    expect(chamadas).toBe(1);

    fireEvent.click(screen.getByText('Atualizar sugestões'));
    await estabilizar(fixture);

    expect(chamadas).toBe(2);
  });

  it('bloqueia o botao de atualizar enquanto a consulta esta em andamento', async () => {
    const { fixture } = await renderPage();
    fixture.detectChanges();

    // Durante o GET inicial o botao fica desabilitado; apos a resposta, habilita.
    const botao = screen.getByText('Atualizar sugestões') as HTMLButtonElement;
    expect(botao.disabled).toBe(true);

    await estabilizar(fixture);
    expect(botao.disabled).toBe(false);
  });

  it('lista vazia e estado valido, sem fixture fabricada', async () => {
    server.use(http.get(SUGESTOES_URL, () => HttpResponse.json([])));
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    expect(screen.getByText('Nenhuma sugestão de matching pendente de decisão.')).toBeTruthy();
  });

  it('mostra erro com retry quando a consulta falha', async () => {
    let falhar = true;
    server.use(
      http.get(SUGESTOES_URL, () => {
        if (falhar) {
          return HttpResponse.json({ message: 'erro interno' }, { status: 500 });
        }
        return HttpResponse.json([]);
      }),
    );
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    expect(screen.getByRole('alert')).toBeTruthy();

    falhar = false;
    fireEvent.click(screen.getByText('Tentar novamente'));
    await estabilizar(fixture);

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Nenhuma sugestão de matching pendente de decisão.')).toBeTruthy();
  });

  it('pagina tem um unico heading nivel 1', async () => {
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    expect(screen.getAllByRole('heading', { level: 1 }).length).toBe(1);
  });

  it('explica o refresh-on-read e não promete confirmação automatica', async () => {
    const { fixture } = await renderPage();
    await estabilizar(fixture);

    expect(screen.getByText(/atualização pode registrar e auditar sugestões novas/i)).toBeTruthy();
    expect(screen.getByText(/nada é confirmado automaticamente/i)).toBeTruthy();
  });
});
