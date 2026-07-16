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
import { MatchingDetailPageComponent } from './matching-detail-page.component';

const MATCHING_SUGERIDA_ID = '7f0799c0-98b9-6d9d-bc4a-7d6f5b78f001';
const MATCHING_INEXISTENTE_ID = '7f0799c0-98b9-6d9d-bc4a-7d6f5b78ffff';

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const BASE_URL = 'http://localhost:8080/api/v1';
const DETALHE_URL = `${BASE_URL}/credores/matching/${MATCHING_SUGERIDA_ID}`;
const DECISAO_URL = `${DETALHE_URL}/decisao`;

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

// errorInterceptor sempre na cadeia: as provas de 403 local rodam contra o redirect global real,
// que o TRATA_403_LOCALMENTE do CredoraService deve suprimir. stepUpInterceptor entra quando o
// cenario precisa anexar/consumir o token de uso unico.
function renderDetalhe(
  sugestaoId: string,
  opts: { comStepUp?: boolean; tokenInicial?: string } = {},
) {
  return render(MatchingDetailPageComponent, {
    providers: [
      opts.comStepUp
        ? provideHttpClient(withInterceptors([stepUpInterceptor, errorInterceptor]))
        : provideHttpClient(withInterceptors([errorInterceptor])),
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ sugestaoId }) } },
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

// Seta o usuario corrente direto no estado privado do AuthService para simular a sessao do
// operador financeiro com/sem MFA (mesmo atalho dos specs do financeiro).
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

describe('MatchingDetailPageComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetCredoraState();
  });

  it('rota /app/credora/matching/:sugestaoId e protegida por roleGuard para FINANCEIRO/ADMIN', () => {
    const rota = CREDORA_ROUTES.find((r) => r.path === 'matching/:sugestaoId');

    expect(rota).toBeTruthy();
    expect(rota?.canActivate?.length).toBe(1);
    expect(rota?.data?.['roles']).toEqual(['FINANCEIRO', 'ADMIN']);
  });

  it('mostra loading acessivel e depois o detalhe autoritativo da sugestao SUGERIDA', async () => {
    const { fixture } = await renderDetalhe(MATCHING_SUGERIDA_ID);

    expect(screen.getByRole('status')).toBeTruthy();

    await estabilizar(fixture);

    expect(screen.getByRole('heading', { name: 'Detalhe do matching' })).toBeTruthy();
    expect(screen.getByText('Sugerida')).toBeTruthy();
    expect(screen.getByText(/25\.000,00/)).toBeTruthy();
    expect(screen.getByText('CONTRATO_ASSINADO')).toBeTruthy();
    expect(screen.getByText('Confirmar matching')).toBeTruthy();
    expect(screen.getByText('Rejeitar matching')).toBeTruthy();
  });

  it('status terminal mostra resultado e data sem CTA de decisao', async () => {
    server.use(
      http.get(DETALHE_URL, () =>
        HttpResponse.json({
          id: MATCHING_SUGERIDA_ID,
          operacaoId: '7f0799c0-98b9-6d9d-bc4a-7d6f5b78c001',
          empresaCredoraId: '7f0799c0-98b9-6d9d-bc4a-7d6f5b780001',
          status: 'CONFIRMADA',
          valorElegivel: 25000.0,
          criterios: ['CREDORA_ATIVA'],
          criadaEm: '2026-07-10T12:00:00-03:00',
          decididaEm: '2026-07-11T09:30:00-03:00',
        }),
      ),
    );
    const { fixture } = await renderDetalhe(MATCHING_SUGERIDA_ID);
    await estabilizar(fixture);

    expect(screen.getByText('Confirmada')).toBeTruthy();
    expect(screen.getByText('Decidida em')).toBeTruthy();
    expect(screen.getByText(/o aporte e um passo separado/i)).toBeTruthy();
    expect(screen.queryByText('Confirmar matching')).toBeNull();
    expect(screen.queryByText('Rejeitar matching')).toBeNull();
  });

  it('404 mostra estado indisponivel neutro sem ecoar UUID', async () => {
    const { fixture } = await renderDetalhe(MATCHING_INEXISTENTE_ID);
    await estabilizar(fixture);

    expect(screen.getByText(/Sugestao de matching indisponivel/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(UUID_PATTERN);
  });

  it('sem MFA ativo, a decisao e bloqueada com orientacao e nenhum dialogo abre', async () => {
    const { fixture } = await renderDetalhe(MATCHING_SUGERIDA_ID);
    autenticarFinanceiro(fixture, false);
    await estabilizar(fixture);

    fireEvent.click(screen.getByText('Confirmar matching'));
    await estabilizar(fixture);

    expect(screen.getByText(/verificacao em duas etapas \(MFA\) ativa/)).toBeTruthy();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('clique em decidir reconsulta o detalhe e so abre o dialogo se ainda SUGERIDA', async () => {
    let consultas = 0;
    server.use(
      http.get(DETALHE_URL, () => {
        consultas += 1;
        return HttpResponse.json({
          id: MATCHING_SUGERIDA_ID,
          operacaoId: '7f0799c0-98b9-6d9d-bc4a-7d6f5b78c001',
          empresaCredoraId: '7f0799c0-98b9-6d9d-bc4a-7d6f5b780001',
          status: 'SUGERIDA',
          valorElegivel: 25000.0,
          criterios: ['CREDORA_ATIVA'],
          criadaEm: '2026-07-10T12:00:00-03:00',
          decididaEm: null,
        });
      }),
    );
    const { fixture } = await renderDetalhe(MATCHING_SUGERIDA_ID);
    autenticarFinanceiro(fixture, true);
    await estabilizar(fixture);
    expect(consultas).toBe(1);

    fireEvent.click(screen.getByText('Confirmar matching'));
    await estabilizar(fixture);

    expect(consultas).toBe(2);
    const dialogo = screen.getByRole('alertdialog');
    expect(dialogo.textContent).toContain('Voce esta confirmando o matching');
    expect(dialogo.textContent).toContain('o aporte e um passo separado');
    expect(screen.getByLabelText('Motivo (opcional)')).toBeTruthy();
    expect(screen.getByText('0/255')).toBeTruthy();
  });

  it('se a reconsulta devolve status terminal, o dialogo nao abre e o resultado aparece', async () => {
    const { fixture } = await renderDetalhe(MATCHING_SUGERIDA_ID);
    autenticarFinanceiro(fixture, true);
    await estabilizar(fixture);

    server.use(
      http.get(DETALHE_URL, () =>
        HttpResponse.json({
          id: MATCHING_SUGERIDA_ID,
          operacaoId: '7f0799c0-98b9-6d9d-bc4a-7d6f5b78c001',
          empresaCredoraId: '7f0799c0-98b9-6d9d-bc4a-7d6f5b780001',
          status: 'REJEITADA',
          valorElegivel: 25000.0,
          criterios: ['CREDORA_ATIVA'],
          criadaEm: '2026-07-10T12:00:00-03:00',
          decididaEm: '2026-07-11T09:30:00-03:00',
        }),
      ),
    );
    fireEvent.click(screen.getByText('Confirmar matching'));
    await estabilizar(fixture);

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByText('Rejeitada')).toBeTruthy();
    expect(screen.getByText(/nao aceita nova decisao/)).toBeTruthy();
  });

  it('falha na reconsulta nao abre dialogo nem chama o POST', async () => {
    const { fixture } = await renderDetalhe(MATCHING_SUGERIDA_ID);
    autenticarFinanceiro(fixture, true);
    await estabilizar(fixture);

    let postChamado = false;
    server.use(
      http.get(DETALHE_URL, () => HttpResponse.json({ message: 'erro' }, { status: 500 })),
      http.post(DECISAO_URL, () => {
        postChamado = true;
        return HttpResponse.json({});
      }),
    );
    fireEvent.click(screen.getByText('Confirmar matching'));
    await estabilizar(fixture);

    expect(postChamado).toBe(false);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByText(/podem estar desatualizados/)).toBeTruthy();
  });

  it('sem token de step-up, confirmar no dialogo navega para o step-up com next desta rota', async () => {
    const { fixture } = await renderDetalhe(MATCHING_SUGERIDA_ID);
    autenticarFinanceiro(fixture, true);
    const router = fixture.debugElement.injector.get(Router);
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    await estabilizar(fixture);

    let postChamado = false;
    server.use(
      http.post(DECISAO_URL, () => {
        postChamado = true;
        return HttpResponse.json({});
      }),
    );

    fireEvent.click(screen.getByText('Confirmar matching'));
    await estabilizar(fixture);
    fireEvent.click(screen.getByText('Confirmar decisao'));
    await estabilizar(fixture);

    expect(navegar).toHaveBeenCalledWith(
      `/app/step-up?next=/app/credora/matching/${MATCHING_SUGERIDA_ID}`,
    );
    expect(postChamado).toBe(false);
    // Voltar do step-up nunca decide sozinho: a confirmacao fechou e exige novo clique.
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('com token, confirma a decisao com motivo e substitui o detalhe pelo estado terminal', async () => {
    let bodyRecebido: unknown = null;
    let tokenRecebido: string | null = null;
    server.use(
      http.post(DECISAO_URL, async ({ request }) => {
        tokenRecebido = request.headers.get('X-Step-Up-Token');
        bodyRecebido = await request.json();
        return HttpResponse.json({
          id: MATCHING_SUGERIDA_ID,
          operacaoId: '7f0799c0-98b9-6d9d-bc4a-7d6f5b78c001',
          empresaCredoraId: '7f0799c0-98b9-6d9d-bc4a-7d6f5b780001',
          status: 'CONFIRMADA',
          valorElegivel: 25000.0,
          criterios: ['CREDORA_ATIVA'],
          criadaEm: '2026-07-10T12:00:00-03:00',
          decididaEm: '2026-07-12T10:00:00-03:00',
        });
      }),
    );
    const { fixture } = await renderDetalhe(MATCHING_SUGERIDA_ID, {
      comStepUp: true,
      tokenInicial: 'step-up-tok',
    });
    autenticarFinanceiro(fixture, true);
    await estabilizar(fixture);

    fireEvent.click(screen.getByText('Confirmar matching'));
    await estabilizar(fixture);
    fireEvent.input(screen.getByLabelText('Motivo (opcional)'), {
      target: { value: 'par validado' },
    });
    fixture.detectChanges();
    expect(screen.getByText('12/255')).toBeTruthy();

    fireEvent.click(screen.getByText('Confirmar decisao'));
    await estabilizar(fixture);

    expect(tokenRecebido).toBe('step-up-tok');
    expect(bodyRecebido).toEqual({ acao: 'CONFIRMAR', motivo: 'par validado' });
    expect(screen.getByText('Confirmada')).toBeTruthy();
    expect(screen.getByText(/Matching confirmado e registrado/)).toBeTruthy();
    expect(screen.getByText(/o aporte e um passo separado/)).toBeTruthy();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('rejeitar envia REJEITAR e mostra o estado rejeitado', async () => {
    const { fixture } = await renderDetalhe(MATCHING_SUGERIDA_ID, {
      comStepUp: true,
      tokenInicial: 'step-up-tok',
    });
    autenticarFinanceiro(fixture, true);
    await estabilizar(fixture);

    fireEvent.click(screen.getByText('Rejeitar matching'));
    await estabilizar(fixture);
    fireEvent.click(screen.getByText('Rejeitar sugestao'));
    await estabilizar(fixture);

    // Mock stateful: o POST real do handler muda o status para REJEITADA.
    expect(screen.getByText('Rejeitada')).toBeTruthy();
    expect(screen.getByText(/nao aceita nova decisao/)).toBeTruthy();
  });

  it('409 na decisao reconsulta e mostra que a sugestao ja foi decidida, sem sucesso presumido', async () => {
    server.use(
      http.post(DECISAO_URL, () =>
        HttpResponse.json({ message: 'Sugestao ja decidida' }, { status: 409 }),
      ),
      http.get(DETALHE_URL, () =>
        HttpResponse.json({
          id: MATCHING_SUGERIDA_ID,
          operacaoId: '7f0799c0-98b9-6d9d-bc4a-7d6f5b78c001',
          empresaCredoraId: '7f0799c0-98b9-6d9d-bc4a-7d6f5b780001',
          status: 'SUGERIDA',
          valorElegivel: 25000.0,
          criterios: ['CREDORA_ATIVA'],
          criadaEm: '2026-07-10T12:00:00-03:00',
          decididaEm: null,
        }),
      ),
    );
    const { fixture } = await renderDetalhe(MATCHING_SUGERIDA_ID, {
      comStepUp: true,
      tokenInicial: 'step-up-tok',
    });
    autenticarFinanceiro(fixture, true);
    await estabilizar(fixture);

    fireEvent.click(screen.getByText('Confirmar matching'));
    await estabilizar(fixture);
    fireEvent.click(screen.getByText('Confirmar decisao'));
    await estabilizar(fixture);

    expect(screen.getByText(/ja foi decidida/)).toBeTruthy();
    expect(screen.queryByText(/Matching confirmado e registrado/)).toBeNull();
  });

  it('403 na decisao com MFA ativo oferece reverificacao explicita sem redirect global', async () => {
    server.use(
      http.post(DECISAO_URL, () =>
        HttpResponse.json({ message: 'Step-up invalido' }, { status: 403 }),
      ),
    );
    const { fixture } = await renderDetalhe(MATCHING_SUGERIDA_ID, {
      comStepUp: true,
      tokenInicial: 'step-up-tok',
    });
    autenticarFinanceiro(fixture, true);
    const router = fixture.debugElement.injector.get(Router);
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    await estabilizar(fixture);

    fireEvent.click(screen.getByText('Confirmar matching'));
    await estabilizar(fixture);
    fireEvent.click(screen.getByText('Confirmar decisao'));
    await estabilizar(fixture);

    // Sem redirect automatico (nem /access-denied global, nem step-up em loop).
    expect(navegar).not.toHaveBeenCalled();
    expect(screen.getByText(/Nao foi possivel confirmar sua identidade/)).toBeTruthy();

    fireEvent.click(screen.getByText('Verificar novamente'));
    await estabilizar(fixture);

    expect(navegar).toHaveBeenCalledWith(
      `/app/step-up?next=/app/credora/matching/${MATCHING_SUGERIDA_ID}`,
    );
  });

  it('rede/5xx na decisao marca o snapshot como desatualizado e bloqueia novo gesto', async () => {
    server.use(
      http.post(DECISAO_URL, () => HttpResponse.json({ message: 'erro' }, { status: 500 })),
    );
    const { fixture } = await renderDetalhe(MATCHING_SUGERIDA_ID, {
      comStepUp: true,
      tokenInicial: 'step-up-tok',
    });
    autenticarFinanceiro(fixture, true);
    await estabilizar(fixture);

    fireEvent.click(screen.getByText('Confirmar matching'));
    await estabilizar(fixture);
    fireEvent.click(screen.getByText('Confirmar decisao'));
    await estabilizar(fixture);

    expect(screen.getByText(/Nao foi possivel concluir a decisao/)).toBeTruthy();
    expect(screen.getByText(/podem estar desatualizados/)).toBeTruthy();
    expect((screen.getByText('Confirmar matching') as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByText('Atualizar sugestao'));
    await estabilizar(fixture);

    expect((screen.getByText('Confirmar matching') as HTMLButtonElement).disabled).toBe(false);
  });

  it('403 no GET do detalhe segue o fluxo global de acesso negado (sem supressao)', async () => {
    server.use(
      http.get(DETALHE_URL, () =>
        HttpResponse.json({ message: 'Sem role FINANCEIRO/ADMIN' }, { status: 403 }),
      ),
    );
    const { fixture } = await renderDetalhe(MATCHING_SUGERIDA_ID);
    const router = fixture.debugElement.injector.get(Router);
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    await estabilizar(fixture);

    // Leitura sem TRATA_403_LOCALMENTE: o errorInterceptor ejeta para /access-denied.
    expect(navegar).toHaveBeenCalledWith('/access-denied');
  });

  it('400 na decisao mostra a mensagem da API e mantem o contexto, sem sucesso presumido', async () => {
    server.use(
      http.post(DECISAO_URL, () =>
        HttpResponse.json({ message: 'motivo nao pode exceder 255 caracteres' }, { status: 400 }),
      ),
    );
    const { fixture } = await renderDetalhe(MATCHING_SUGERIDA_ID, {
      comStepUp: true,
      tokenInicial: 'step-up-tok',
    });
    autenticarFinanceiro(fixture, true);
    await estabilizar(fixture);

    fireEvent.click(screen.getByText('Confirmar matching'));
    await estabilizar(fixture);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar decisao' }));
    await estabilizar(fixture);

    expect(screen.getByText('motivo nao pode exceder 255 caracteres')).toBeTruthy();
    expect(screen.queryByText(/Matching confirmado e registrado/)).toBeNull();
    // A sugestao continua decidivel apos a correcao.
    expect(screen.getByText('Confirmar matching')).toBeTruthy();
  });

  it('duplo clique no CTA de decisao dispara UMA reconsulta', async () => {
    let consultas = 0;
    server.use(
      http.get(DETALHE_URL, () => {
        consultas += 1;
        return HttpResponse.json({
          id: MATCHING_SUGERIDA_ID,
          operacaoId: '7f0799c0-98b9-6d9d-bc4a-7d6f5b78c001',
          empresaCredoraId: '7f0799c0-98b9-6d9d-bc4a-7d6f5b780001',
          status: 'SUGERIDA',
          valorElegivel: 25000.0,
          criterios: ['CREDORA_ATIVA'],
          criadaEm: '2026-07-10T12:00:00-03:00',
          decididaEm: null,
        });
      }),
    );
    const { fixture } = await renderDetalhe(MATCHING_SUGERIDA_ID);
    autenticarFinanceiro(fixture, true);
    await estabilizar(fixture);
    expect(consultas).toBe(1);

    const cta = screen.getByText('Confirmar matching');
    fireEvent.click(cta);
    fireEvent.click(cta);
    await estabilizar(fixture);

    // 1 inicial + 1 reconsulta: o segundo clique cai no guard de decisao bloqueada.
    expect(consultas).toBe(2);
  });

  it('duplo clique em Confirmar decisao dispara UM POST', async () => {
    let posts = 0;
    server.use(
      http.post(DECISAO_URL, () => {
        posts += 1;
        return HttpResponse.json({
          id: MATCHING_SUGERIDA_ID,
          operacaoId: '7f0799c0-98b9-6d9d-bc4a-7d6f5b78c001',
          empresaCredoraId: '7f0799c0-98b9-6d9d-bc4a-7d6f5b780001',
          status: 'CONFIRMADA',
          valorElegivel: 25000.0,
          criterios: ['CREDORA_ATIVA'],
          criadaEm: '2026-07-10T12:00:00-03:00',
          decididaEm: '2026-07-12T10:00:00-03:00',
        });
      }),
    );
    const { fixture } = await renderDetalhe(MATCHING_SUGERIDA_ID, {
      comStepUp: true,
      tokenInicial: 'step-up-tok',
    });
    autenticarFinanceiro(fixture, true);
    await estabilizar(fixture);

    fireEvent.click(screen.getByText('Confirmar matching'));
    await estabilizar(fixture);

    const confirmar = screen.getByRole('button', { name: 'Confirmar decisao' });
    fireEvent.click(confirmar);
    fireEvent.click(confirmar);
    await estabilizar(fixture);

    expect(posts).toBe(1);
  });

  it('pagina tem um unico heading nivel 1', async () => {
    const { fixture } = await renderDetalhe(MATCHING_SUGERIDA_ID);
    await estabilizar(fixture);

    expect(screen.getAllByRole('heading', { level: 1 }).length).toBe(1);
  });

  it('clique rapido repetido em Tentar novamente nao abre consultas concorrentes', async () => {
    let consultas = 0;
    server.use(
      http.get(DETALHE_URL, () => {
        consultas += 1;
        return HttpResponse.json({ message: 'erro' }, { status: 500 });
      }),
    );
    const { fixture } = await renderDetalhe(MATCHING_SUGERIDA_ID);
    await estabilizar(fixture);
    expect(consultas).toBe(1);

    const retry = screen.getByText('Tentar novamente');
    fireEvent.click(retry);
    fireEvent.click(retry);
    await estabilizar(fixture);

    expect(consultas).toBe(2);
  });

  it('Escape fecha o dialogo sem decidir e devolve o foco ao gatilho', async () => {
    const { fixture } = await renderDetalhe(MATCHING_SUGERIDA_ID, {
      comStepUp: true,
      tokenInicial: 'step-up-tok',
    });
    autenticarFinanceiro(fixture, true);
    await estabilizar(fixture);

    const gatilho = screen.getByText('Confirmar matching');
    (gatilho as HTMLButtonElement).focus();
    fireEvent.click(gatilho);
    await estabilizar(fixture);

    const dialogo = screen.getByRole('alertdialog');
    expect(document.activeElement).toBe(dialogo);

    fireEvent.keyDown(dialogo, { key: 'Escape' });
    await estabilizar(fixture);

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByText('Sugerida')).toBeTruthy();
    expect(document.activeElement).toBe(gatilho);
  });
});
