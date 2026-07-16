import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../../core/auth/auth.service';
import { StepUpTokenStore } from '../../../../core/auth/step-up-token.store';
import { errorInterceptor } from '../../../../core/interceptors/error.interceptor';
import { stepUpInterceptor } from '../../../../core/interceptors/step-up.interceptor';
import { resetCredoraState } from '../../../../../mocks/handlers';
import { server } from '../../../../../mocks/server';
import { CREDORA_ROUTES } from '../credora.routes';
import { MatchingAportePageComponent } from './matching-aporte-page.component';

const MATCHING_SUGERIDA_ID = '7f0799c0-98b9-6d9d-bc4a-7d6f5b78f001';
const OPERACAO_ID = '7f0799c0-98b9-6d9d-bc4a-7d6f5b78c001';

const BASE_URL = 'http://localhost:8080/api/v1';
const DETALHE_URL = `${BASE_URL}/credores/matching/${MATCHING_SUGERIDA_ID}`;
const APORTES_URL = `${BASE_URL}/credores/operacoes/${OPERACAO_ID}/aportes`;

const MATCHING_CONFIRMADA = {
  id: MATCHING_SUGERIDA_ID,
  operacaoId: OPERACAO_ID,
  empresaCredoraId: '7f0799c0-98b9-6d9d-bc4a-7d6f5b780001',
  status: 'CONFIRMADA',
  valorElegivel: 25000.0,
  criterios: ['CREDORA_ATIVA'],
  criadaEm: '2026-07-10T12:00:00-03:00',
  decididaEm: '2026-07-11T09:30:00-03:00',
};

async function flush(times = 6): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

async function estabilizar(fixture: ComponentFixture<unknown>): Promise<void> {
  await fixture.whenStable();
  await flush();
  fixture.detectChanges();
}

function renderAporte(opts: { comStepUp?: boolean; tokenInicial?: string } = {}) {
  return render(MatchingAportePageComponent, {
    providers: [
      opts.comStepUp
        ? provideHttpClient(withInterceptors([stepUpInterceptor, errorInterceptor]))
        : provideHttpClient(withInterceptors([errorInterceptor])),
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { paramMap: convertToParamMap({ sugestaoId: MATCHING_SUGERIDA_ID }) },
        },
      },
      ...(opts.tokenInicial
        ? [
            {
              provide: StepUpTokenStore,
              useFactory: () => {
                const store = new StepUpTokenStore();
                store.set(opts.tokenInicial as string);
                return store;
              },
            },
          ]
        : []),
    ],
  });
}

function autenticarFinanceiro(fixture: ComponentFixture<unknown>, mfaHabilitado: boolean): void {
  const auth = fixture.debugElement.injector.get(AuthService) as unknown as {
    currentUserState: { set: (u: unknown) => void };
  };
  auth.currentUserState.set({
    id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771002',
    username: 'financeiro@empresa.com',
    role: 'FINANCEIRO',
    mfaHabilitado,
    dataCriacao: '2026-04-24T18:30:00-03:00',
    dataModificacao: '2026-04-24T18:30:00-03:00',
    criadoPor: 'system',
    modificadoPor: 'system',
  });
}

// Prepara o cenario padrao: matching CONFIRMADA no detalhe (o seed nasce SUGERIDA).
function comMatchingConfirmada(): void {
  server.use(http.get(DETALHE_URL, () => HttpResponse.json(MATCHING_CONFIRMADA)));
}

describe('MatchingAportePageComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetCredoraState();
  });

  it('rota /app/credora/matching/:sugestaoId/aporte e protegida por roleGuard FINANCEIRO/ADMIN', () => {
    const rota = CREDORA_ROUTES.find((r) => r.path === 'matching/:sugestaoId/aporte');

    expect(rota).toBeTruthy();
    expect(rota?.canActivate?.length).toBe(1);
    expect(rota?.data?.['roles']).toEqual(['FINANCEIRO', 'ADMIN']);
  });

  it('matching nao confirmado nao oferece CTA de aporte', async () => {
    // Seed real: a sugestao nasce SUGERIDA.
    const { fixture } = await renderAporte();
    await estabilizar(fixture);

    expect(
      screen.getByText(/aporte assistido so esta disponivel para matching confirmado/i),
    ).toBeTruthy();
    expect(screen.queryByText('Registrar aporte')).toBeNull();
    expect(screen.queryByLabelText('Valor do aporte (R$)')).toBeNull();
  });

  it('matching confirmado preenche o valor com o valorElegivel do backend e lista os aportes', async () => {
    comMatchingConfirmada();
    const { fixture } = await renderAporte();
    await estabilizar(fixture);
    // Segundo ciclo: a lista embutida so dispara o GET apos o matching renderizar.
    await estabilizar(fixture);

    const input = screen.getByLabelText('Valor do aporte (R$)') as HTMLInputElement;
    expect(input.value).toBe('25000.00');
    expect(screen.getByText(/provider local \(fake\)/i)).toBeTruthy();
    // Lista owner-scoped da operacao (seed: um aporte LIQUIDADO).
    expect(screen.getByText(/10\.000,00/)).toBeTruthy();
    expect(screen.getByText('Liquidado')).toBeTruthy();
  });

  it('valida somente o formato do valor antes de abrir a confirmacao', async () => {
    comMatchingConfirmada();
    const { fixture } = await renderAporte();
    autenticarFinanceiro(fixture, true);
    await estabilizar(fixture);

    const input = screen.getByLabelText('Valor do aporte (R$)');
    for (const invalido of ['', 'abc', '-5', '10.123']) {
      fireEvent.input(input, { target: { value: invalido } });
      fireEvent.click(screen.getByText('Registrar aporte'));
      fixture.detectChanges();

      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(screen.getByText(/valor/i, { selector: '[role="alert"]' })).toBeTruthy();
    }
  });

  it('sem MFA ativo, bloqueia o registro com orientacao', async () => {
    comMatchingConfirmada();
    const { fixture } = await renderAporte();
    autenticarFinanceiro(fixture, false);
    await estabilizar(fixture);

    fireEvent.click(screen.getByText('Registrar aporte'));
    await estabilizar(fixture);

    expect(screen.getByText(/verificacao em duas etapas \(MFA\) ativa/)).toBeTruthy();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('sem token de step-up, confirmar navega ao step-up com next desta rota e nao chama o POST', async () => {
    comMatchingConfirmada();
    let postChamado = false;
    server.use(
      http.post(APORTES_URL, () => {
        postChamado = true;
        return HttpResponse.json({});
      }),
    );
    const { fixture } = await renderAporte();
    autenticarFinanceiro(fixture, true);
    const router = fixture.debugElement.injector.get(Router);
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    await estabilizar(fixture);

    fireEvent.click(screen.getByText('Registrar aporte'));
    await estabilizar(fixture);
    expect(screen.getByRole('alertdialog').textContent).toContain('nenhum dinheiro real');

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar aporte' }));
    await estabilizar(fixture);

    expect(navegar).toHaveBeenCalledWith(
      `/app/step-up?next=/app/credora/matching/${MATCHING_SUGERIDA_ID}/aporte`,
    );
    expect(postChamado).toBe(false);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('com token, registra com Idempotency-Key, mostra o DTO retornado e reconsulta a lista', async () => {
    comMatchingConfirmada();
    const { fixture } = await renderAporte({ comStepUp: true, tokenInicial: 'step-up-tok' });
    autenticarFinanceiro(fixture, true);
    await estabilizar(fixture);

    fireEvent.click(screen.getByText('Registrar aporte'));
    await estabilizar(fixture);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar aporte' }));
    await estabilizar(fixture);

    // Handler MSW real valida X-Step-Up-Token e Idempotency-Key e devolve 201 PENDENTE.
    expect(screen.getByText(/Aporte registrado no valor de/)).toBeTruthy();
    // Badge no resultado e na lista reconsultada (novo aporte PENDENTE).
    expect(screen.getAllByText('Pendente').length).toBeGreaterThanOrEqual(1);
    // Lista reconsultada: o novo aporte de 25.000,00 aparece junto do LIQUIDADO seed.
    expect(screen.getAllByText(/25\.000,00/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/10\.000,00/)).toBeTruthy();
    // Nenhuma key aparece na UI.
    expect(document.body.textContent).not.toContain('Idempotency');
  });

  it('retry apos rede/5xx reusa a MESMA key para o mesmo valor; mudar o valor gera key nova', async () => {
    comMatchingConfirmada();
    const keys: string[] = [];
    let falhas = 1;
    server.use(
      http.post(APORTES_URL, ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key') ?? '');
        if (falhas > 0) {
          falhas -= 1;
          return HttpResponse.json({ message: 'erro' }, { status: 500 });
        }
        return HttpResponse.json(
          {
            id: 'aporte-novo',
            operacaoId: OPERACAO_ID,
            status: 'PENDENTE',
            valor: 25000,
            dataCriacao: '2026-07-16T10:00:00-03:00',
            dataAtualizacao: '2026-07-16T10:00:00-03:00',
          },
          { status: 201 },
        );
      }),
    );
    const { fixture } = await renderAporte({ comStepUp: true, tokenInicial: 'step-up-tok' });
    autenticarFinanceiro(fixture, true);
    await estabilizar(fixture);

    // 1a tentativa: falha de rede/5xx — intencao preservada.
    fireEvent.click(screen.getByText('Registrar aporte'));
    await estabilizar(fixture);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar aporte' }));
    await estabilizar(fixture);
    expect(screen.getByText(/Atualize o status antes de tentar novamente/)).toBeTruthy();

    // 2a tentativa com o MESMO valor: mesma key (novo step-up ja disponivel no store do teste).
    const store = fixture.debugElement.injector.get(StepUpTokenStore);
    store.set('step-up-tok-2');
    fireEvent.click(screen.getByText('Registrar aporte'));
    await estabilizar(fixture);
    falhas = 1;
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar aporte' }));
    await estabilizar(fixture);

    expect(keys.length).toBe(2);
    expect(keys[1]).toBe(keys[0]);

    // 3a tentativa com valor DIFERENTE: nova intencao, key nova.
    store.set('step-up-tok-3');
    fireEvent.input(screen.getByLabelText('Valor do aporte (R$)'), {
      target: { value: '20000.00' },
    });
    fireEvent.click(screen.getByText('Registrar aporte'));
    await estabilizar(fixture);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar aporte' }));
    await estabilizar(fixture);

    expect(keys.length).toBe(3);
    expect(keys[2]).not.toBe(keys[0]);
  });

  it('replay idempotente 200 e sucesso real, nao erro', async () => {
    comMatchingConfirmada();
    server.use(
      http.post(APORTES_URL, () =>
        HttpResponse.json({
          id: 'aporte-existente',
          operacaoId: OPERACAO_ID,
          status: 'EM_PROCESSAMENTO',
          valor: 25000,
          dataCriacao: '2026-07-15T10:00:00-03:00',
          dataAtualizacao: '2026-07-16T08:00:00-03:00',
        }),
      ),
    );
    const { fixture } = await renderAporte({ comStepUp: true, tokenInicial: 'step-up-tok' });
    autenticarFinanceiro(fixture, true);
    await estabilizar(fixture);

    fireEvent.click(screen.getByText('Registrar aporte'));
    await estabilizar(fixture);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar aporte' }));
    await estabilizar(fixture);

    expect(screen.getByText(/Aporte registrado no valor de/)).toBeTruthy();
    expect(screen.getByText('Em processamento')).toBeTruthy();
  });

  it('409 nao presume sucesso e reconsulta a lista', async () => {
    comMatchingConfirmada();
    let listagens = 0;
    server.use(
      http.post(APORTES_URL, () => HttpResponse.json({ message: 'conflito' }, { status: 409 })),
      http.get(APORTES_URL, () => {
        listagens += 1;
        return HttpResponse.json([]);
      }),
    );
    const { fixture } = await renderAporte({ comStepUp: true, tokenInicial: 'step-up-tok' });
    autenticarFinanceiro(fixture, true);
    await estabilizar(fixture);
    // Segundo ciclo: a lista embutida dispara o GET inicial apos o matching renderizar.
    await estabilizar(fixture);
    const listagensAntes = listagens;

    fireEvent.click(screen.getByText('Registrar aporte'));
    await estabilizar(fixture);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar aporte' }));
    await estabilizar(fixture);

    expect(screen.getByText(/nao aceitou o aporte/)).toBeTruthy();
    expect(screen.queryByText(/Aporte registrado no valor de/)).toBeNull();
    expect(listagens).toBe(listagensAntes + 1);
  });

  it('403 no POST oferece reverificacao explicita, preservando a intencao sem reenviar', async () => {
    comMatchingConfirmada();
    let posts = 0;
    server.use(
      http.post(APORTES_URL, () => {
        posts += 1;
        return HttpResponse.json({ message: 'step-up invalido' }, { status: 403 });
      }),
    );
    const { fixture } = await renderAporte({ comStepUp: true, tokenInicial: 'step-up-tok' });
    autenticarFinanceiro(fixture, true);
    const router = fixture.debugElement.injector.get(Router);
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    await estabilizar(fixture);

    fireEvent.click(screen.getByText('Registrar aporte'));
    await estabilizar(fixture);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar aporte' }));
    await estabilizar(fixture);

    expect(posts).toBe(1);
    expect(navegar).not.toHaveBeenCalled();
    expect(screen.getByText(/Nao foi possivel confirmar sua identidade/)).toBeTruthy();

    fireEvent.click(screen.getByText('Verificar novamente'));
    await estabilizar(fixture);

    expect(navegar).toHaveBeenCalledWith(
      `/app/step-up?next=/app/credora/matching/${MATCHING_SUGERIDA_ID}/aporte`,
    );
    expect(posts).toBe(1);
  });

  it('400 no POST mantem o formulario com o valor digitado para correcao', async () => {
    comMatchingConfirmada();
    server.use(
      http.post(APORTES_URL, () =>
        HttpResponse.json({ message: 'valor deve ser positivo' }, { status: 400 }),
      ),
    );
    const { fixture } = await renderAporte({ comStepUp: true, tokenInicial: 'step-up-tok' });
    autenticarFinanceiro(fixture, true);
    await estabilizar(fixture);

    fireEvent.click(screen.getByText('Registrar aporte'));
    await estabilizar(fixture);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar aporte' }));
    await estabilizar(fixture);

    expect(screen.getByText('valor deve ser positivo')).toBeTruthy();
    const input = screen.getByLabelText('Valor do aporte (R$)') as HTMLInputElement;
    expect(input.value).toBe('25000.00');
    expect(screen.queryByText(/Aporte registrado no valor de/)).toBeNull();
  });

  it('404 no POST mostra operacao indisponivel neutra, sem ecoar UUID em erro', async () => {
    comMatchingConfirmada();
    server.use(
      http.post(APORTES_URL, () =>
        HttpResponse.json({ message: 'Operacao nao encontrada para aporte' }, { status: 404 }),
      ),
    );
    const { fixture } = await renderAporte({ comStepUp: true, tokenInicial: 'step-up-tok' });
    autenticarFinanceiro(fixture, true);
    await estabilizar(fixture);

    fireEvent.click(screen.getByText('Registrar aporte'));
    await estabilizar(fixture);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar aporte' }));
    await estabilizar(fixture);

    const erro = screen.getByText('Operacao indisponivel para aporte.');
    expect(erro).toBeTruthy();
    // Mensagem de erro nao contem UUID integral (IDs curtos do contexto ficam fora do alerta).
    expect(erro.textContent).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
  });

  it('duplo clique em Confirmar aporte dispara UM POST', async () => {
    comMatchingConfirmada();
    let posts = 0;
    server.use(
      http.post(APORTES_URL, () => {
        posts += 1;
        return HttpResponse.json(
          {
            id: 'aporte-novo',
            operacaoId: OPERACAO_ID,
            status: 'PENDENTE',
            valor: 25000,
            dataCriacao: '2026-07-16T10:00:00-03:00',
            dataAtualizacao: '2026-07-16T10:00:00-03:00',
          },
          { status: 201 },
        );
      }),
    );
    const { fixture } = await renderAporte({ comStepUp: true, tokenInicial: 'step-up-tok' });
    autenticarFinanceiro(fixture, true);
    await estabilizar(fixture);

    fireEvent.click(screen.getByText('Registrar aporte'));
    await estabilizar(fixture);

    const confirmar = screen.getByRole('button', { name: 'Confirmar aporte' });
    fireEvent.click(confirmar);
    fireEvent.click(confirmar);
    await estabilizar(fixture);

    expect(posts).toBe(1);
  });

  it('pagina tem um unico heading nivel 1', async () => {
    comMatchingConfirmada();
    const { fixture } = await renderAporte();
    await estabilizar(fixture);

    expect(screen.getAllByRole('heading', { level: 1 }).length).toBe(1);
  });

  it('atualiza a lista somente por gesto explicito, sem polling', async () => {
    comMatchingConfirmada();
    let listagens = 0;
    server.use(
      http.get(APORTES_URL, () => {
        listagens += 1;
        return HttpResponse.json([]);
      }),
    );
    const { fixture } = await renderAporte();
    await estabilizar(fixture);
    await estabilizar(fixture);
    expect(listagens).toBe(1);

    fireEvent.click(screen.getByText('Atualizar status'));
    await estabilizar(fixture);

    expect(listagens).toBe(2);
  });
});
