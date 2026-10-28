import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { LucideAngularModule } from 'lucide-angular';
import { http, HttpResponse } from 'msw';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../../core/auth/auth.service';
import { StepUpTokenStore } from '../../../../core/auth/step-up-token.store';
import { LUCIDE_ICONS } from '../../../../core/icons/lucide-icons';
import { stepUpInterceptor } from '../../../../core/interceptors/step-up.interceptor';
import { server } from '../../../../../mocks/server';
import { ReprocessarProviderPageComponent } from './reprocessar-provider-page.component';

const WEBHOOK_EVENT_ID = 'd0000000-0000-4000-8000-000000000001';
const PIX_ENTIDADE_ID = 'd0000000-0000-4000-8000-000000000002';
const PROVIDER_URL = `http://localhost:8080/api/v1/backoffice/reprocessos/provider/PIX_TRANSFERENCIA/${PIX_ENTIDADE_ID}`;

interface Probe {
  providerForm: { patchValue: (valor: Record<string, unknown>) => void };
  webhookForm: { patchValue: (valor: Record<string, unknown>) => void };
  disparar: () => void;
  canal: () => 'provider' | 'webhook';
  permissao: () => string;
  risco: () => { nivel: string; total: number };
  linhasHistorico: () => { resultado: string }[];
  trocarCanal: (canal: 'provider' | 'webhook') => void;
  mailtoSuporte: () => string;
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

function renderPagina(canal: 'provider' | 'webhook' = 'provider', comStepUp = false) {
  return render(ReprocessarProviderPageComponent, {
    providers: [
      comStepUp ? provideHttpClient(withInterceptors([stepUpInterceptor])) : provideHttpClient(),
      provideRouter([]),
      importProvidersFrom(LucideAngularModule.pick(LUCIDE_ICONS)),
      {
        provide: ActivatedRoute,
        useValue: { data: of({ canal }), snapshot: { data: { canal } } },
      },
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

describe('ReprocessarProviderPageComponent', () => {
  it('provider sem step-up redireciona para a confirmacao adicional do proprio canal', async () => {
    const { fixture } = await renderPagina('provider');
    autenticarComMfa(fixture);
    const router = fixture.debugElement.injector.get(Router);
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const probe = fixture.componentInstance as unknown as Probe;
    probe.providerForm.patchValue({ entidadeId: PIX_ENTIDADE_ID });
    probe.disparar();
    await estabilizar(fixture);

    expect(navegar).toHaveBeenCalledWith('/app/step-up?next=/app/backoffice/reprocessos/provider');
  });

  // "Resultado" e "Sucesso" tambem aparecem no historico logo abaixo; as buscas ficam
  // restritas ao painel do disparo para nao casarem com a tabela.
  function painelDeResultado(fixture: ComponentFixture<unknown>): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('.bo19-resultado');
  }

  it('provider com step-up mostra o resultado do reprocesso', async () => {
    const { fixture } = await renderPagina('provider', true);
    fixture.debugElement.injector.get(StepUpTokenStore).set('step-up-tok');

    const probe = fixture.componentInstance as unknown as Probe;
    probe.providerForm.patchValue({ entidadeId: PIX_ENTIDADE_ID });
    probe.disparar();
    await estabilizar(fixture);

    const painel = painelDeResultado(fixture);
    expect(painel).not.toBeNull();
    expect(painel?.textContent).toContain('Resultado');
    expect(painel?.textContent).toContain('Sucesso');
  });

  it('webhook usa o formulario e o endpoint do seu canal', async () => {
    const { fixture } = await renderPagina('webhook', true);
    fixture.debugElement.injector.get(StepUpTokenStore).set('step-up-tok');

    const probe = fixture.componentInstance as unknown as Probe;
    expect(probe.canal()).toBe('webhook');
    expect(probe.permissao()).toBe('REPROCESSAR_WEBHOOK');

    probe.webhookForm.patchValue({ webhookEventId: WEBHOOK_EVENT_ID });
    probe.disparar();
    await estabilizar(fixture);

    expect(painelDeResultado(fixture)?.textContent).toContain('Sucesso');
  });

  it('403 sem MFA explica o step-up em vez da mensagem generica', async () => {
    // Sem token de step-up o backend responde 403; como a conta nao tem MFA, nao ha para onde
    // redirecionar e a tela precisa dizer o que fazer.
    const { fixture } = await renderPagina('provider');

    const probe = fixture.componentInstance as unknown as Probe;
    probe.providerForm.patchValue({ entidadeId: PIX_ENTIDADE_ID });
    probe.disparar();
    await estabilizar(fixture);

    const erro = (fixture.nativeElement as HTMLElement).querySelector('.bo19-erro');
    expect(erro?.textContent).toContain('confirmação adicional');
    expect(erro?.textContent).toContain('duas etapas');
  });

  it('mostra a mensagem de anti-abuso no 429', async () => {
    server.use(
      http.post(PROVIDER_URL, () => HttpResponse.json({ message: 'limite' }, { status: 429 })),
    );
    const { fixture } = await renderPagina('provider', true);
    fixture.debugElement.injector.get(StepUpTokenStore).set('step-up-tok');

    const probe = fixture.componentInstance as unknown as Probe;
    probe.providerForm.patchValue({ entidadeId: PIX_ENTIDADE_ID });
    probe.disparar();
    await estabilizar(fixture);

    expect(screen.getByText(/Limite de 3 reprocessos/)).toBeTruthy();
  });

  it('nao dispara sem o identificador obrigatorio', async () => {
    const { fixture } = await renderPagina('provider', true);
    fixture.debugElement.injector.get(StepUpTokenStore).set('step-up-tok');

    const probe = fixture.componentInstance as unknown as Probe;
    probe.disparar();
    await estabilizar(fixture);

    expect(painelDeResultado(fixture)).toBeNull();
  });

  it('a troca de aba navega para a rota do outro canal', async () => {
    const { fixture } = await renderPagina('provider');
    const router = fixture.debugElement.injector.get(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const probe = fixture.componentInstance as unknown as Probe;
    probe.trocarCanal('webhook');

    expect(navegar).toHaveBeenCalledWith(['/app/backoffice/reprocessos', 'webhook']);
  });

  it('o risco operacional acompanha o volume de disparos do historico', async () => {
    const { fixture } = await renderPagina('provider');
    const probe = fixture.componentInstance as unknown as Probe;

    expect(probe.linhasHistorico()).toHaveLength(5);
    expect(probe.risco().total).toBe(5);
    expect(probe.risco().nivel).toBe('MÉDIO');
  });

  it('o e-mail de suporte carrega os dados da sessao', async () => {
    const { fixture } = await renderPagina('provider');
    const probe = fixture.componentInstance as unknown as Probe;

    const mailto = probe.mailtoSuporte();
    expect(mailto.startsWith('mailto:integracoes@sep.com.br?subject=')).toBe(true);
    expect(mailto).toContain(encodeURIComponent('Provider'));
  });
});
