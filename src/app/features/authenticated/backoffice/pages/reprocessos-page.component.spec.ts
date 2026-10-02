import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../../core/auth/auth.service';
import { StepUpTokenStore } from '../../../../core/auth/step-up-token.store';
import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';
import { stepUpInterceptor } from '../../../../core/interceptors/step-up.interceptor';
import { server } from '../../../../../mocks/server';
import { ReprocessosPageComponent } from './reprocessos-page.component';

const WEBHOOK_EVENT_ID = 'd0000000-0000-4000-8000-000000000001';
const PIX_ENTIDADE_ID = 'd0000000-0000-4000-8000-000000000002';
const WEBHOOK_URL = `http://localhost:8080/api/v1/backoffice/reprocessos/webhook/${WEBHOOK_EVENT_ID}`;

interface Faixa {
  rotulo: string;
  valor: number;
  percentual: string;
}

interface ReprocessoProbe {
  webhookForm: { patchValue: (valor: Record<string, unknown>) => void };
  providerForm: { patchValue: (valor: Record<string, unknown>) => void };
  selecionarAba: (aba: 'webhook' | 'provider') => void;
  reprocessarWebhook: () => void;
  reprocessarProvider: () => void;
  filtros: { patchValue: (valor: Record<string, unknown>) => void };
  aplicarFiltros: () => void;
  irParaPagina: (indice: number) => void;
  filtrarPorStatus: (status: string) => void;
  total: () => number;
  totalPaginas: () => number;
  paginaAtual: () => number;
  visiveis: () => { codigo: string; status: string }[];
  faixa: () => { de: number; ate: number; total: number };
  legendaStatus: () => Faixa[];
  legendaTipo: () => Faixa[];
  emAndamento: () => unknown[];
}

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

function renderPagina(comStepUp = false) {
  return render(ReprocessosPageComponent, {
    providers: [
      comStepUp ? provideHttpClient(withInterceptors([stepUpInterceptor])) : provideHttpClient(),
      provideRouter([]),
      // A tela usa <lucide-icon> na tabela, nos atalhos e no dialogo; sem o set curado o
      // provider de icones nao resolve os nomes e o template quebra no primeiro render.
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
    ],
  });
}

function autenticarComMfa(fixture: ComponentFixture<unknown>): void {
  const auth = fixture.debugElement.injector.get(AuthService) as unknown as {
    currentUserState: { set: (u: unknown) => void };
  };
  auth.currentUserState.set({
    id: '1f0799c0-98b9-6d9d-bc4a-7d6f5b771004',
    username: 'backoffice@empresa.com',
    role: 'BACKOFFICE',
    mfaHabilitado: true,
    dataCriacao: '2026-04-24T18:30:00-03:00',
    dataModificacao: '2026-04-24T18:30:00-03:00',
    criadoPor: 'system',
    modificadoPor: 'system',
  });
}

describe('ReprocessosPageComponent', () => {
  it('webhook sem step-up redireciona para a confirmacao adicional', async () => {
    const { fixture } = await renderPagina();
    autenticarComMfa(fixture);
    const router = fixture.debugElement.injector.get(Router);
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const probe = fixture.componentInstance as unknown as ReprocessoProbe;
    probe.webhookForm.patchValue({ webhookEventId: WEBHOOK_EVENT_ID });
    probe.reprocessarWebhook();
    await estabilizar(fixture);

    expect(navegar).toHaveBeenCalledWith('/app/step-up?next=/app/backoffice/reprocessos');
  });

  it('webhook com step-up mostra o resultado do reprocesso', async () => {
    const { fixture } = await renderPagina(true);
    fixture.debugElement.injector.get(StepUpTokenStore).set('step-up-tok');

    const probe = fixture.componentInstance as unknown as ReprocessoProbe;
    probe.webhookForm.patchValue({ webhookEventId: WEBHOOK_EVENT_ID });
    probe.reprocessarWebhook();
    await estabilizar(fixture);

    expect(screen.getByText('Resultado')).toBeTruthy();
    expect(screen.getByText('Sucesso')).toBeTruthy();
  });

  it('provider PIX_TRANSFERENCIA com step-up retorna sucesso', async () => {
    const { fixture } = await renderPagina(true);
    fixture.debugElement.injector.get(StepUpTokenStore).set('step-up-tok');

    const probe = fixture.componentInstance as unknown as ReprocessoProbe;
    probe.selecionarAba('provider');
    probe.providerForm.patchValue({
      tipoChamada: 'PIX_TRANSFERENCIA',
      entidadeId: PIX_ENTIDADE_ID,
    });
    probe.reprocessarProvider();
    await estabilizar(fixture);

    expect(screen.getByText('Sucesso')).toBeTruthy();
  });

  it('mostra mensagem de anti-abuso no 429', async () => {
    server.use(
      http.post(WEBHOOK_URL, () => HttpResponse.json({ message: 'limite' }, { status: 429 })),
    );
    const { fixture } = await renderPagina(true);
    fixture.debugElement.injector.get(StepUpTokenStore).set('step-up-tok');

    const probe = fixture.componentInstance as unknown as ReprocessoProbe;
    probe.webhookForm.patchValue({ webhookEventId: WEBHOOK_EVENT_ID });
    probe.reprocessarWebhook();
    await estabilizar(fixture);

    expect(screen.getByText(/Limite de 3 reprocessos/)).toBeTruthy();
  });

  it('as duas distribuicoes fecham no mesmo total e somam 100%', async () => {
    const { fixture } = await renderPagina();
    const probe = fixture.componentInstance as unknown as ReprocessoProbe;

    const somaStatus = probe.legendaStatus().reduce((soma, faixa) => soma + faixa.valor, 0);
    const somaTipo = probe.legendaTipo().reduce((soma, faixa) => soma + faixa.valor, 0);
    expect(somaStatus).toBe(probe.total());
    expect(somaTipo).toBe(probe.total());
    expect(probe.total()).toBe(128);

    // O mockup imprime 3,4% para Falhas; 12 de 128 sao 9,4%. A tela usa o valor calculado.
    const falhas = probe.legendaStatus().find((faixa) => faixa.rotulo === 'Falhas');
    expect(falhas?.valor).toBe(12);
    expect(falhas?.percentual).toBe('9,4%');
  });

  it('pagina de 8 em 8 e navega ate a ultima pagina', async () => {
    const { fixture } = await renderPagina();
    const probe = fixture.componentInstance as unknown as ReprocessoProbe;

    expect(probe.visiveis()).toHaveLength(8);
    expect(probe.totalPaginas()).toBe(16);
    expect(probe.faixa()).toEqual({ de: 1, ate: 8, total: 128 });
    expect(probe.visiveis()[0].codigo).toBe('RPR-000128');

    probe.irParaPagina(15);
    expect(probe.paginaAtual()).toBe(15);
    expect(probe.faixa()).toEqual({ de: 121, ate: 128, total: 128 });
  });

  it('filtro de status reduz a lista e reposiciona a paginacao', async () => {
    const { fixture } = await renderPagina();
    const probe = fixture.componentInstance as unknown as ReprocessoProbe;

    probe.irParaPagina(15);
    probe.filtrarPorStatus('FALHA');

    expect(probe.faixa().total).toBe(12);
    expect(probe.paginaAtual()).toBe(0);
    expect(probe.visiveis().every((linha) => linha.status === 'FALHA')).toBe(true);
  });

  it('a busca textual encontra o reprocesso pela referencia', async () => {
    const { fixture } = await renderPagina();
    const probe = fixture.componentInstance as unknown as ReprocessoProbe;

    probe.filtros.patchValue({ busca: 'CTR-5b771e03' });
    probe.aplicarFiltros();

    expect(probe.faixa().total).toBe(1);
    expect(probe.visiveis()[0].codigo).toBe('RPR-000127');
  });

  it('execucoes em andamento correspondem a faixa Em execucao do donut', async () => {
    const { fixture } = await renderPagina();
    const probe = fixture.componentInstance as unknown as ReprocessoProbe;

    const emExecucao = probe.legendaStatus().find((faixa) => faixa.rotulo === 'Em execução');
    expect(probe.emAndamento()).toHaveLength(emExecucao?.valor ?? 0);
    expect(probe.emAndamento()).toHaveLength(9);
  });
});
