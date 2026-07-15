import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../../core/auth/auth.service';
import { StepUpTokenStore } from '../../../../core/auth/step-up-token.store';
import { CobrancaService } from '../../../../core/cobranca/cobranca.service';
import { errorInterceptor } from '../../../../core/interceptors/error.interceptor';
import { stepUpInterceptor } from '../../../../core/interceptors/step-up.interceptor';
import { server } from '../../../../../mocks/server';
import { RenegociacaoTomadorPageComponent } from './renegociacao-tomador-page.component';

const PARCELA_EM_NEGOCIACAO_ID = 'a0000000-0000-4000-8000-000000000008';
const PARCELA_ACEITE_TOMADOR_ID = 'a0000000-0000-4000-8000-000000000009';
const PARCELA_RECUSA_TOMADOR_ID = 'a0000000-0000-4000-8000-00000000000a';
const PARCELA_PENDENTE_ID = 'a0000000-0000-4000-8000-000000000001';
const PARCELA_SEM_OWNERSHIP_ID = 'a0000000-0000-4000-8000-0000000000ff';

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const BASE_URL = 'http://localhost:8080/api/v1';

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

function renderProposta(
  parcelaId: string,
  opts: { comStepUp?: boolean; tokenInicial?: string } = {},
) {
  const tokenInicial = opts.tokenInicial;
  // errorInterceptor sempre na cadeia (fix review manual F-16): as provas de 403 local
  // (estado neutro, reverificacao explicita) rodam contra o redirect global real de
  // /access-denied — o contexto TRATA_403_LOCALMENTE do service deve suprimi-lo.
  return render(RenegociacaoTomadorPageComponent, {
    providers: [
      opts.comStepUp
        ? provideHttpClient(withInterceptors([stepUpInterceptor, errorInterceptor]))
        : provideHttpClient(withInterceptors([errorInterceptor])),
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ parcelaId }) } },
      },
      ...(tokenInicial
        ? [
            {
              provide: StepUpTokenStore,
              useFactory: () => {
                const store = new StepUpTokenStore();
                store.set(tokenInicial);
                return store;
              },
            },
          ]
        : []),
    ],
  });
}

// Mesmo atalho dos specs do financeiro: seta o usuario corrente direto no estado privado
// do AuthService para simular a sessao do tomador com/sem MFA.
function autenticarTomador(fixture: ComponentFixture<unknown>, mfaHabilitado: boolean): void {
  const auth = fixture.debugElement.injector.get(AuthService) as unknown as {
    currentUserState: { set: (u: unknown) => void };
  };
  auth.currentUserState.set({
    id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771001',
    username: 'cliente@empresa.com',
    role: 'CLIENTE',
    mfaHabilitado,
    dataCriacao: '2026-04-24T18:30:00-03:00',
    dataModificacao: '2026-04-24T18:30:00-03:00',
    criadoPor: 'system',
    modificadoPor: 'system',
  });
}

describe('RenegociacaoTomadorPageComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('mostra loading acessivel enquanto consulta os termos', async () => {
    const { fixture } = await renderProposta(PARCELA_EM_NEGOCIACAO_ID);

    expect(screen.getByRole('status')).toBeTruthy();

    await estabilizar(fixture);
  });

  it('exibe os termos autoritativos da proposta ativa', async () => {
    const { fixture } = await renderProposta(PARCELA_EM_NEGOCIACAO_ID);
    await estabilizar(fixture);

    expect(screen.getByRole('heading', { name: 'Proposta de renegociacao' })).toBeTruthy();
    expect(screen.getByText('Aguardando sua decisao')).toBeTruthy();
    expect(screen.getByText('Novo valor por parcela')).toBeTruthy();
    expect(screen.getByText(/340,00/)).toBeTruthy();
    expect(screen.getByText('Quantidade de parcelas')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('Desconto')).toBeTruthy();
    expect(screen.getByText(/60,00/)).toBeTruthy();
    expect(screen.getByText('Primeiro vencimento')).toBeTruthy();
    expect(screen.getByText('15/08/2026')).toBeTruthy();
    expect(screen.getByText('Data da proposta')).toBeTruthy();
    expect(screen.getByText('Valida ate')).toBeTruthy();
  });

  it('exibe o total exatamente como veio do backend, sem calculo local', async () => {
    const { fixture } = await renderProposta(PARCELA_EM_NEGOCIACAO_ID);
    await estabilizar(fixture);

    expect(screen.getByText('Valor total renegociado')).toBeTruthy();
    expect(screen.getByText(/1\.700,00/)).toBeTruthy();
  });

  it('nao expoe IDs tecnicos nem campos internos no DOM', async () => {
    const { fixture, container } = await renderProposta(PARCELA_EM_NEGOCIACAO_ID);
    await estabilizar(fixture);

    expect(container.textContent).not.toMatch(UUID_PATTERN);
    expect(container.textContent).not.toMatch(/justificativa|proposta por|agenda/i);
  });

  it('mostra proposta indisponivel com volta para a parcela quando o backend responde 404', async () => {
    const { fixture } = await renderProposta(PARCELA_PENDENTE_ID);
    await estabilizar(fixture);

    expect(screen.getByText(/Nenhuma proposta de renegociacao disponivel/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Voltar para a parcela/ })).toBeTruthy();
  });

  it('mostra erro neutro com retry no 403, sem enumerar recurso nem redirect global', async () => {
    const { fixture, container } = await renderProposta(PARCELA_SEM_OWNERSHIP_ID);
    const router = fixture.debugElement.injector.get(Router);
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    await estabilizar(fixture);

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Tentar novamente/ })).toBeTruthy();
    expect(container.textContent).not.toMatch(UUID_PATTERN);
    // errorInterceptor esta na cadeia: o contexto do service suprime o /access-denied.
    expect(navegar).not.toHaveBeenCalled();
  });

  describe('aceite com step-up estrito', () => {
    it('bloqueia o aceite sem MFA ativo e orienta a habilitacao', async () => {
      const { fixture } = await renderProposta(PARCELA_EM_NEGOCIACAO_ID);
      await estabilizar(fixture);
      autenticarTomador(fixture, false);

      fireEvent.click(screen.getByRole('button', { name: /Aceitar proposta/ }));
      await estabilizar(fixture);

      expect(screen.getByRole('alert').textContent).toContain('verificacao em duas etapas');
      const link = screen.getByRole('link', { name: /Ativar verificacao em duas etapas/ });
      expect(link.getAttribute('href')).toBe('/app/profile/setup-totp');
      expect(screen.queryByRole('alertdialog')).toBeNull();
    });

    it('reconsulta os termos e abre a confirmacao explicita com o snapshot novo', async () => {
      const { fixture } = await renderProposta(PARCELA_EM_NEGOCIACAO_ID);
      await estabilizar(fixture);
      autenticarTomador(fixture, true);

      fireEvent.click(screen.getByRole('button', { name: /Aceitar proposta/ }));
      await estabilizar(fixture);

      const dialog = screen.getByRole('alertdialog');
      expect(dialog.textContent).toContain('Confirmar aceite');
      expect(dialog.textContent).toContain('1.700,00');
      expect(dialog.textContent).toContain('15/08/2026');
    });

    it('sem token, confirmar leva ao step-up com next desta rota e nao envia PATCH', async () => {
      const { fixture } = await renderProposta(PARCELA_EM_NEGOCIACAO_ID, { comStepUp: true });
      await estabilizar(fixture);
      autenticarTomador(fixture, true);
      const router = fixture.debugElement.injector.get(Router);
      const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
      const cobranca = fixture.debugElement.injector.get(CobrancaService);
      const aceitar = vi.spyOn(cobranca, 'aceitarRenegociacao');

      fireEvent.click(screen.getByRole('button', { name: /Aceitar proposta/ }));
      await estabilizar(fixture);
      fireEvent.click(screen.getByRole('button', { name: /Confirmar aceite/ }));
      await estabilizar(fixture);

      expect(navegar).toHaveBeenCalledWith(
        `/app/step-up?next=/app/cobranca/parcelas/${PARCELA_EM_NEGOCIACAO_ID}/renegociacao`,
      );
      expect(aceitar).not.toHaveBeenCalled();
      expect(screen.queryByRole('alertdialog')).toBeNull();
    });

    it('com token presente ao entrar, nada e aceito automaticamente', async () => {
      const { fixture } = await renderProposta(PARCELA_EM_NEGOCIACAO_ID, {
        comStepUp: true,
        tokenInicial: 'step-up-tok',
      });
      await estabilizar(fixture);

      const store = fixture.debugElement.injector.get(StepUpTokenStore);
      expect(store.token()).toBe('step-up-tok');
      expect(screen.queryByText(/Proposta aceita/)).toBeNull();
      expect(screen.getByRole('button', { name: /Aceitar proposta/ })).toBeTruthy();
    });

    it('aceita com confirmacao: PATCH unico, token consumido e estado final sem nova decisao', async () => {
      const { fixture } = await renderProposta(PARCELA_ACEITE_TOMADOR_ID, {
        comStepUp: true,
        tokenInicial: 'step-up-tok',
      });
      await estabilizar(fixture);
      autenticarTomador(fixture, true);
      const cobranca = fixture.debugElement.injector.get(CobrancaService);
      const aceitar = vi.spyOn(cobranca, 'aceitarRenegociacao');

      fireEvent.click(screen.getByRole('button', { name: /Aceitar proposta/ }));
      await estabilizar(fixture);
      const confirmar = screen.getByRole('button', { name: /Confirmar aceite/ });
      fireEvent.click(confirmar);
      // Duplo clique imediato: o guard de decisao em voo deve segurar a segunda tentativa.
      fireEvent.click(confirmar);
      await estabilizar(fixture);

      expect(aceitar).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Proposta aceita/)).toBeTruthy();
      const store = fixture.debugElement.injector.get(StepUpTokenStore);
      expect(store.token()).toBeNull();
      expect(screen.queryByRole('button', { name: /Aceitar proposta/ })).toBeNull();
      expect(screen.queryByRole('alertdialog')).toBeNull();
    });
  });

  describe('recusa sem step-up', () => {
    it('reconsulta, abre confirmacao de recusa e cancelar nao chama a API', async () => {
      const { fixture } = await renderProposta(PARCELA_EM_NEGOCIACAO_ID);
      await estabilizar(fixture);
      const cobranca = fixture.debugElement.injector.get(CobrancaService);
      const consultar = vi.spyOn(cobranca, 'consultarRenegociacaoAtiva');
      const recusar = vi.spyOn(cobranca, 'recusarRenegociacao');

      fireEvent.click(screen.getByRole('button', { name: /Recusar proposta/ }));
      await estabilizar(fixture);

      const dialog = screen.getByRole('alertdialog');
      expect(consultar).toHaveBeenCalledTimes(1);
      expect(dialog.textContent).toContain('Confirmar recusa');
      expect(dialog.textContent).toContain('1.700,00');

      fireEvent.click(screen.getByRole('button', { name: /^Cancelar$/ }));
      await estabilizar(fixture);

      expect(recusar).not.toHaveBeenCalled();
      expect(screen.queryByRole('alertdialog')).toBeNull();
    });

    it('recusa sem MFA, sem navegar para step-up e preservando token eventual', async () => {
      const { fixture } = await renderProposta(PARCELA_RECUSA_TOMADOR_ID, {
        comStepUp: true,
        tokenInicial: 'step-up-tok',
      });
      await estabilizar(fixture);
      const router = fixture.debugElement.injector.get(Router);
      const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
      const cobranca = fixture.debugElement.injector.get(CobrancaService);
      const recusar = vi.spyOn(cobranca, 'recusarRenegociacao');

      fireEvent.click(screen.getByRole('button', { name: /Recusar proposta/ }));
      await estabilizar(fixture);
      const confirmar = screen.getByRole('button', { name: /Confirmar recusa/ });
      fireEvent.click(confirmar);
      // Duplo clique imediato: guard de decisao em voo segura a segunda tentativa.
      fireEvent.click(confirmar);
      await estabilizar(fixture);

      expect(recusar).toHaveBeenCalledTimes(1);
      expect(navegar).not.toHaveBeenCalled();
      const store = fixture.debugElement.injector.get(StepUpTokenStore);
      expect(store.token()).toBe('step-up-tok');
      expect(screen.getByText(/Proposta recusada/)).toBeTruthy();
      expect(screen.queryByRole('button', { name: /Recusar proposta/ })).toBeNull();
      expect(screen.queryByRole('alertdialog')).toBeNull();
    });

    it('clique cruzado: com a confirmacao de recusa aberta, aceitar nao abre nem dispara', async () => {
      const { fixture } = await renderProposta(PARCELA_EM_NEGOCIACAO_ID);
      await estabilizar(fixture);
      autenticarTomador(fixture, true);
      const cobranca = fixture.debugElement.injector.get(CobrancaService);
      const aceitar = vi.spyOn(cobranca, 'aceitarRenegociacao');

      fireEvent.click(screen.getByRole('button', { name: /Recusar proposta/ }));
      await estabilizar(fixture);
      fireEvent.click(screen.getByRole('button', { name: /Aceitar proposta/ }));
      await estabilizar(fixture);

      const dialog = screen.getByRole('alertdialog');
      expect(dialog.textContent).toContain('Confirmar recusa');
      expect(dialog.textContent).not.toContain('Confirmar aceite');
      expect(aceitar).not.toHaveBeenCalled();
    });
  });

  describe('dialogo acessivel (fix review manual)', () => {
    it('move o foco para a confirmacao ao abrir e devolve ao gatilho ao cancelar', async () => {
      const { fixture } = await renderProposta(PARCELA_EM_NEGOCIACAO_ID);
      await estabilizar(fixture);
      autenticarTomador(fixture, true);

      const gatilho = screen.getByRole('button', { name: /Aceitar proposta/ });
      gatilho.focus();
      fireEvent.click(gatilho);
      await estabilizar(fixture);

      const dialog = screen.getByRole('alertdialog');
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(document.activeElement).toBe(dialog);

      fireEvent.click(screen.getByRole('button', { name: /^Cancelar$/ }));
      await estabilizar(fixture);

      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(document.activeElement).toBe(gatilho);
    });

    it('Escape cancela a confirmacao sem chamar a API', async () => {
      const { fixture } = await renderProposta(PARCELA_EM_NEGOCIACAO_ID);
      await estabilizar(fixture);
      const cobranca = fixture.debugElement.injector.get(CobrancaService);
      const recusar = vi.spyOn(cobranca, 'recusarRenegociacao');

      fireEvent.click(screen.getByRole('button', { name: /Recusar proposta/ }));
      await estabilizar(fixture);

      fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
      await estabilizar(fixture);

      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(recusar).not.toHaveBeenCalled();
    });
  });

  describe('matriz de falhas (116.5)', () => {
    function aceitarButton(): HTMLButtonElement {
      return screen.getByRole('button', { name: /Aceitar proposta/ }) as HTMLButtonElement;
    }

    it('rede na reconsulta mantem os termos como desatualizados e bloqueia decisoes ate nova leitura', async () => {
      const { fixture } = await renderProposta(PARCELA_EM_NEGOCIACAO_ID);
      await estabilizar(fixture);
      autenticarTomador(fixture, true);

      server.use(
        http.get(`${BASE_URL}/cobranca/parcelas/:parcelaId/renegociacao-ativa`, () =>
          HttpResponse.error(),
        ),
      );
      fireEvent.click(aceitarButton());
      await estabilizar(fixture);

      expect(screen.getByText('Valor total renegociado')).toBeTruthy();
      expect(screen.getByText(/podem estar desatualizados/)).toBeTruthy();
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(aceitarButton().disabled).toBe(true);

      server.resetHandlers();
      fireEvent.click(screen.getByRole('button', { name: /Atualizar termos/ }));
      await estabilizar(fixture);

      expect(screen.queryByText(/podem estar desatualizados/)).toBeNull();
      expect(aceitarButton().disabled).toBe(false);
    });

    it('404 na reconsulta do aceite encerra a decisao como proposta indisponivel', async () => {
      const { fixture } = await renderProposta(PARCELA_EM_NEGOCIACAO_ID);
      await estabilizar(fixture);
      autenticarTomador(fixture, true);

      server.use(
        http.get(`${BASE_URL}/cobranca/parcelas/:parcelaId/renegociacao-ativa`, () =>
          HttpResponse.json({ message: 'Not Found' }, { status: 404 }),
        ),
      );
      fireEvent.click(aceitarButton());
      await estabilizar(fixture);

      expect(screen.getByText(/Nenhuma proposta de renegociacao disponivel/)).toBeTruthy();
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(screen.queryByRole('button', { name: /Aceitar proposta/ })).toBeNull();
    });

    it('403 no aceite autenticado oferece reverificacao explicita, sem loop automatico', async () => {
      const { fixture } = await renderProposta(PARCELA_EM_NEGOCIACAO_ID, {
        comStepUp: true,
        tokenInicial: 'step-up-tok',
      });
      await estabilizar(fixture);
      autenticarTomador(fixture, true);
      const router = fixture.debugElement.injector.get(Router);
      const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
      server.use(
        http.patch(`${BASE_URL}/cobranca/renegociacoes/:id/aceite`, () =>
          HttpResponse.json({ message: 'Forbidden' }, { status: 403 }),
        ),
      );

      fireEvent.click(aceitarButton());
      await estabilizar(fixture);
      fireEvent.click(screen.getByRole('button', { name: /Confirmar aceite/ }));
      await estabilizar(fixture);

      expect(navegar).not.toHaveBeenCalled();
      expect(screen.queryByText(/Proposta aceita/)).toBeNull();
      expect(screen.getByText(/Nao foi possivel confirmar sua identidade/)).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: /Verificar novamente/ }));
      expect(navegar).toHaveBeenCalledWith(
        `/app/step-up?next=/app/cobranca/parcelas/${PARCELA_EM_NEGOCIACAO_ID}/renegociacao`,
      );
    });

    it('409 no aceite invalida o snapshot, reconsulta os termos e nao mostra sucesso', async () => {
      const { fixture } = await renderProposta(PARCELA_EM_NEGOCIACAO_ID, {
        comStepUp: true,
        tokenInicial: 'step-up-tok',
      });
      await estabilizar(fixture);
      autenticarTomador(fixture, true);
      const cobranca = fixture.debugElement.injector.get(CobrancaService);
      const consultar = vi.spyOn(cobranca, 'consultarRenegociacaoAtiva');
      server.use(
        http.patch(`${BASE_URL}/cobranca/renegociacoes/:id/aceite`, () =>
          HttpResponse.json({ message: 'Conflict' }, { status: 409 }),
        ),
      );

      fireEvent.click(aceitarButton());
      await estabilizar(fixture);
      fireEvent.click(screen.getByRole('button', { name: /Confirmar aceite/ }));
      await estabilizar(fixture);

      expect(screen.queryByText(/Proposta aceita/)).toBeNull();
      expect(screen.getByText(/foi alterada ou ja decidida/)).toBeTruthy();
      expect(screen.queryByRole('alertdialog')).toBeNull();
      // reconsulta do clique + reconsulta pos-409
      expect(consultar).toHaveBeenCalledTimes(2);
    });

    it('rede no aceite nunca vira sucesso e exige nova leitura antes de tentar de novo', async () => {
      const { fixture } = await renderProposta(PARCELA_EM_NEGOCIACAO_ID, {
        comStepUp: true,
        tokenInicial: 'step-up-tok',
      });
      await estabilizar(fixture);
      autenticarTomador(fixture, true);
      server.use(
        http.patch(`${BASE_URL}/cobranca/renegociacoes/:id/aceite`, () => HttpResponse.error()),
      );

      fireEvent.click(aceitarButton());
      await estabilizar(fixture);
      fireEvent.click(screen.getByRole('button', { name: /Confirmar aceite/ }));
      await estabilizar(fixture);

      expect(screen.queryByText(/Proposta aceita/)).toBeNull();
      expect(screen.getByText(/Atualize os termos antes de tentar novamente/)).toBeTruthy();
      expect(screen.getByText(/podem estar desatualizados/)).toBeTruthy();
      expect(aceitarButton().disabled).toBe(true);
    });

    it('403 na recusa mostra acesso negado neutro, sem iniciar step-up', async () => {
      const { fixture } = await renderProposta(PARCELA_EM_NEGOCIACAO_ID, {
        comStepUp: true,
        tokenInicial: 'step-up-tok',
      });
      await estabilizar(fixture);
      const router = fixture.debugElement.injector.get(Router);
      const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
      server.use(
        http.patch(`${BASE_URL}/cobranca/renegociacoes/:id/recusa`, () =>
          HttpResponse.json({ message: 'Forbidden' }, { status: 403 }),
        ),
      );

      fireEvent.click(screen.getByRole('button', { name: /Recusar proposta/ }));
      await estabilizar(fixture);
      fireEvent.click(screen.getByRole('button', { name: /Confirmar recusa/ }));
      await estabilizar(fixture);

      expect(screen.queryByText(/Proposta recusada/)).toBeNull();
      expect(screen.getByText('Acesso negado.')).toBeTruthy();
      expect(navegar).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: /Verificar novamente/ })).toBeNull();
      const store = fixture.debugElement.injector.get(StepUpTokenStore);
      expect(store.token()).toBe('step-up-tok');
    });

    it('409 na recusa invalida o snapshot e reconsulta os termos', async () => {
      const { fixture } = await renderProposta(PARCELA_EM_NEGOCIACAO_ID);
      await estabilizar(fixture);
      server.use(
        http.patch(`${BASE_URL}/cobranca/renegociacoes/:id/recusa`, () =>
          HttpResponse.json({ message: 'Conflict' }, { status: 409 }),
        ),
      );

      fireEvent.click(screen.getByRole('button', { name: /Recusar proposta/ }));
      await estabilizar(fixture);
      fireEvent.click(screen.getByRole('button', { name: /Confirmar recusa/ }));
      await estabilizar(fixture);

      expect(screen.queryByText(/Proposta recusada/)).toBeNull();
      expect(screen.getByText(/foi alterada ou ja decidida/)).toBeTruthy();
      expect(screen.queryByRole('alertdialog')).toBeNull();
    });

    it('rede na recusa nunca vira sucesso e exige nova leitura antes de tentar de novo', async () => {
      const { fixture } = await renderProposta(PARCELA_EM_NEGOCIACAO_ID);
      await estabilizar(fixture);
      server.use(
        http.patch(`${BASE_URL}/cobranca/renegociacoes/:id/recusa`, () => HttpResponse.error()),
      );

      fireEvent.click(screen.getByRole('button', { name: /Recusar proposta/ }));
      await estabilizar(fixture);
      fireEvent.click(screen.getByRole('button', { name: /Confirmar recusa/ }));
      await estabilizar(fixture);

      expect(screen.queryByText(/Proposta recusada/)).toBeNull();
      expect(screen.getByText(/Atualize os termos antes de tentar novamente/)).toBeTruthy();
      expect(aceitarButton().disabled).toBe(true);
    });
  });
});
